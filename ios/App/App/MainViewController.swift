import UIKit
import WebKit
import Capacitor

// Renders the app's bottom nav and top header as genuine native "Liquid
// Glass" surfaces (UIVisualEffectView + UIGlassEffect on iOS 26+) with
// real UIButtons/UILabels, instead of the CSS .nav-tabs / .app-header
// elements.
//
// Putting a native blur *behind* CSS-rendered content blurs that content
// too — WKWebView flattens everything into one layer, and the blur view
// samples whatever's in that rect indiscriminately. Crisp content over a
// real native blur requires the content itself to be native views layered
// on top.
//
// .nav-tabs / .app-header stay in the DOM (invisible on iOS) purely as
// the single source of truth: native taps call .click() on the matching
// web button (data-tab / data-action) so existing React handlers/state
// are untouched, and their content/visibility/active-state/theme are read
// back by nativeShell.ts and posted here via WKScriptMessage — several
// flows in App.tsx change tabs or header content programmatically (not
// just taps), so native can't just own this state locally; it mirrors web
// state rather than owning it.
private enum TabBarGlassMetrics {
    static let sideMargin: CGFloat = 16
    static let bottomMargin: CGFloat = 8
    static let height: CGFloat = 64
    static let cornerRadius: CGFloat = 24
}

private struct TabSpec {
    let id: String
    let symbol: String
    let title: String
}

private let tabSpecs: [TabSpec] = [
    TabSpec(id: "expenses", symbol: "doc.text", title: "Expenses"),
    TabSpec(id: "members", symbol: "person.2", title: "Members"),
    TabSpec(id: "analytics", symbol: "chart.bar", title: "Analytics"),
    TabSpec(id: "settings", symbol: "gearshape", title: "Settings"),
]

// Mirrors --primary-accent / --text-secondary from index.css exactly, for
// both themes, so the native bar's tint matches the web content around it.
private enum TabBarColors {
    static let activeLight = UIColor(red: 0x1F / 255, green: 0x6E / 255, blue: 0x68 / 255, alpha: 1)
    static let activeDark = UIColor(red: 0x59 / 255, green: 0xBD / 255, blue: 0xB2 / 255, alpha: 1)
    static let inactiveLight = UIColor(red: 0x52 / 255, green: 0x62 / 255, blue: 0x7A / 255, alpha: 1)
    static let inactiveDark = UIColor(red: 0xA7 / 255, green: 0xAF / 255, blue: 0xC0 / 255, alpha: 1)
}

// .app-header's own background stays a dark navy banner regardless of the
// app's light/dark theme toggle (see --bg-header in index.css), so unlike
// the tab bar these colors don't need to branch per-theme.
private enum HeaderMetrics {
    // Must match html.capacitor-ios .tab-pane's reserved padding-top in
    // index.css (safe-top + this value) — the header shrinks *into* that
    // reserved space as the user scrolls rather than the space itself
    // resizing, so nothing needs to stay in sync mid-scroll.
    static let expandedContentHeight: CGFloat = 100
    static let collapsedContentHeight: CGFloat = 44
    static let titleExpandedSize: CGFloat = 22
    static let titleCollapsedSize: CGFloat = 17
}

private enum HeaderColors {
    static let tint = UIColor(red: 0x1C / 255, green: 0x2A / 255, blue: 0x38 / 255, alpha: 1)
    static let textPrimary = UIColor(red: 0xF2 / 255, green: 0xEC / 255, blue: 0xDC / 255, alpha: 1)
    static let textMuted = UIColor(red: 0x92 / 255, green: 0xA2 / 255, blue: 0xAE / 255, alpha: 1)
    static let syncSynced = UIColor(red: 0x10 / 255, green: 0xB9 / 255, blue: 0x81 / 255, alpha: 1)
    static let syncOutOfSync = UIColor(red: 0xF5 / 255, green: 0x9E / 255, blue: 0x0B / 255, alpha: 1)
    static let syncOffline = UIColor(red: 0x9C / 255, green: 0xA3 / 255, blue: 0xAF / 255, alpha: 1)
    static let syncExpired = UIColor(red: 0xEF / 255, green: 0x44 / 255, blue: 0x44 / 255, alpha: 1)
}

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private let navTabsStateHandlerName = "navTabsState"
    private let headerStateHandlerName = "headerState"
    private let headerScrollHandlerName = "headerScroll"

    // MARK: Tab bar

    // glassContainer casts the floating shadow (a view with clipsToBounds
    // can't also cast its own shadow, since the shadow renders outside its
    // bounds) — glassView inside it does the actual corner-radius clipping
    // for the blur content.
    private let glassContainer = UIView()
    private let glassView = UIVisualEffectView()
    private let selectionIndicator = UIView()
    private var tabButtons: [UIButton] = []
    private var currentTheme: String = "light"
    private var currentActive: String?

    // MARK: Header

    private let headerGlass = UIVisualEffectView()
    private var headerHeightConstraint: NSLayoutConstraint?
    private let eyebrowLabel = UILabel()
    private let titleLabel = UILabel()
    private let statsLabel = UILabel()
    private let syncDot = UIView()
    private let syncLabel = UILabel()
    private let syncPill = UIView()
    private let shareButton = UIButton()
    private let tripsButton = UIButton()
    private var headerStatsRow: UIStackView?
    private var headerScrollProgress: CGFloat = 0
    private var headerElementsHidden = false

    override func viewDidLoad() {
        super.viewDidLoad()
        // CAPBridgeViewController.prepareWebView() overwrites
        // webViewConfiguration(for:)'s userContentController with its own
        // instance right after calling that override, so registering
        // message handlers there gets silently discarded. Register them
        // here instead, against the webview's actual final controller,
        // which exists once viewDidLoad runs (after loadView() has
        // already built the real webView).
        let contentController = webView?.configuration.userContentController
        contentController?.add(self, name: navTabsStateHandlerName)
        contentController?.add(self, name: headerStateHandlerName)
        contentController?.add(self, name: headerScrollHandlerName)

        setUpTabBar()
        setUpHeader()
    }

    deinit {
        let contentController = webView?.configuration.userContentController
        contentController?.removeScriptMessageHandler(forName: navTabsStateHandlerName)
        contentController?.removeScriptMessageHandler(forName: headerStateHandlerName)
        contentController?.removeScriptMessageHandler(forName: headerScrollHandlerName)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Button frames (which the indicator targets) are only valid after
        // a layout pass — reposition without animating, since this fires on
        // every layout change (including rotation), not just tab switches.
        positionSelectionIndicator(for: currentActive, animated: false)
        // safeAreaInsets also isn't reliable before the first layout pass —
        // re-applying the last known scroll progress here (rather than only
        // in response to scroll messages) is what actually establishes the
        // correct initial header height, and keeps it correct through
        // rotation too.
        applyHeaderScrollProgress(headerScrollProgress)
    }

    // MARK: - Tab bar setup

    private func setUpTabBar() {
        guard let webView = self.webView else { return }

        glassContainer.isHidden = true
        glassContainer.layer.shadowColor = UIColor.black.cgColor
        glassContainer.layer.shadowOpacity = 0.16
        glassContainer.layer.shadowRadius = 16
        glassContainer.layer.shadowOffset = CGSize(width: 0, height: 6)
        glassContainer.translatesAutoresizingMaskIntoConstraints = false
        webView.addSubview(glassContainer)

        NSLayoutConstraint.activate([
            glassContainer.leadingAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.leadingAnchor, constant: TabBarGlassMetrics.sideMargin),
            glassContainer.trailingAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.trailingAnchor, constant: -TabBarGlassMetrics.sideMargin),
            glassContainer.bottomAnchor.constraint(equalTo: webView.safeAreaLayoutGuide.bottomAnchor, constant: -TabBarGlassMetrics.bottomMargin),
            glassContainer.heightAnchor.constraint(equalToConstant: TabBarGlassMetrics.height),
        ])

        if #available(iOS 26.0, *) {
            glassView.effect = UIGlassEffect()
        } else {
            glassView.effect = UIBlurEffect(style: .systemMaterial)
        }
        glassView.layer.cornerRadius = TabBarGlassMetrics.cornerRadius
        glassView.clipsToBounds = true
        // A faint light rim along the glass's own edge — real glass/acrylic
        // catches a highlight here, which is what actually sells the
        // "glass" read rather than just "blurred rounded rectangle".
        glassView.layer.borderWidth = 0.75
        glassView.layer.borderColor = UIColor.white.withAlphaComponent(0.35).cgColor
        glassView.translatesAutoresizingMaskIntoConstraints = false
        glassContainer.addSubview(glassView)

        NSLayoutConstraint.activate([
            glassView.leadingAnchor.constraint(equalTo: glassContainer.leadingAnchor),
            glassView.trailingAnchor.constraint(equalTo: glassContainer.trailingAnchor),
            glassView.topAnchor.constraint(equalTo: glassContainer.topAnchor),
            glassView.bottomAnchor.constraint(equalTo: glassContainer.bottomAnchor),
        ])

        selectionIndicator.backgroundColor = UIColor.label.withAlphaComponent(0.08)
        selectionIndicator.layer.cornerRadius = 16
        selectionIndicator.alpha = 0
        // Added before the stack, so it sits behind the icons/labels in
        // z-order instead of covering them.
        glassView.contentView.addSubview(selectionIndicator)

        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        glassView.contentView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: glassView.contentView.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: glassView.contentView.trailingAnchor),
            stack.topAnchor.constraint(equalTo: glassView.contentView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: glassView.contentView.bottomAnchor),
        ])

        tabButtons = tabSpecs.enumerated().map { index, spec in
            let button = makeTabButton(for: spec)
            button.tag = index
            button.addTarget(self, action: #selector(tabTapped(_:)), for: .touchUpInside)
            stack.addArrangedSubview(button)
            return button
        }

        applyTheme(currentTheme, active: nil)
    }

    private func makeTabButton(for spec: TabSpec) -> UIButton {
        var config = UIButton.Configuration.plain()
        // Thin weight matches the app's custom icon set (1.75pt outline
        // strokes) — SF Symbols at .regular/.medium read as noticeably
        // bolder/heavier at a comparable size than that hand-drawn set.
        config.image = UIImage(systemName: spec.symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 20, weight: .thin))
        config.title = spec.title
        config.imagePlacement = .top
        config.imagePadding = 4
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = .systemFont(ofSize: 9, weight: .semibold)
            return outgoing
        }
        let button = UIButton(configuration: config)
        button.accessibilityLabel = spec.title
        return button
    }

    @objc private func tabTapped(_ sender: UIButton) {
        guard sender.tag < tabSpecs.count else { return }

        // A quick squash-and-release gives the tap itself a sense of
        // motion, on top of the indicator's own slide once the real state
        // change comes back through navTabsState.
        UIView.animate(withDuration: 0.1, delay: 0, options: [.curveEaseOut], animations: {
            sender.transform = CGAffineTransform(scaleX: 0.88, y: 0.88)
        }, completion: { _ in
            UIView.animate(withDuration: 0.15, delay: 0, usingSpringWithDamping: 0.5, initialSpringVelocity: 0.5, options: [.curveEaseOut], animations: {
                sender.transform = .identity
            })
        })

        let tabId = tabSpecs[sender.tag].id
        // The tap's effect on .active/highlighting comes back through the
        // navTabsState message once React re-renders, not from here — this
        // just forwards the tap to the real (invisible) web button.
        webView?.evaluateJavaScript("document.querySelector('.nav-tab-item[data-tab=\"\(tabId)\"]')?.click();")
    }

    private func applyTheme(_ theme: String, active: String?) {
        let activeColor = theme == "dark" ? TabBarColors.activeDark : TabBarColors.activeLight
        let inactiveColor = theme == "dark" ? TabBarColors.inactiveDark : TabBarColors.inactiveLight

        for (index, button) in tabButtons.enumerated() {
            let spec = tabSpecs[index]
            let isActive = spec.id == active
            button.configuration?.baseForegroundColor = isActive ? activeColor : inactiveColor
            // Filled glyph for the active tab, outline otherwise — the same
            // convention Apple's own tab bars use to mark selection beyond
            // just color, so it still reads correctly for colorblind users.
            let symbolName = isActive ? "\(spec.symbol).fill" : spec.symbol
            button.configuration?.image = UIImage(systemName: symbolName, withConfiguration: UIImage.SymbolConfiguration(pointSize: 20, weight: .thin))
        }
    }

    // Slides the highlight capsule to sit behind whichever tab is active,
    // rather than just snapping visibility/color — the motion itself is
    // what reads as "the selection moving through" the bar.
    private func positionSelectionIndicator(for tabId: String?, animated: Bool) {
        guard let index = tabSpecs.firstIndex(where: { $0.id == tabId }),
              index < tabButtons.count,
              tabButtons[index].frame != .zero else {
            selectionIndicator.alpha = 0
            return
        }

        let inset: CGFloat = 6
        let targetFrame = tabButtons[index].frame.insetBy(dx: inset, dy: inset)
        let updates = {
            self.selectionIndicator.frame = targetFrame
            self.selectionIndicator.alpha = 1
        }

        if animated {
            UIView.animate(withDuration: 0.35, delay: 0, usingSpringWithDamping: 0.75, initialSpringVelocity: 0.4, options: [.curveEaseInOut], animations: updates)
        } else {
            updates()
        }
    }

    // MARK: - Header setup

    private func setUpHeader() {
        guard let webView = self.webView else { return }

        if #available(iOS 26.0, *) {
            let effect = UIGlassEffect()
            effect.tintColor = HeaderColors.tint
            headerGlass.effect = effect
        } else {
            headerGlass.effect = UIBlurEffect(style: .systemMaterialDark)
        }
        headerGlass.isHidden = true
        headerGlass.translatesAutoresizingMaskIntoConstraints = false
        webView.addSubview(headerGlass)

        // Placeholder — safeAreaInsets isn't reliably populated yet this
        // early in the view lifecycle (viewDidLoad, before first layout),
        // so the real initial value is set from viewDidLayoutSubviews via
        // applyHeaderScrollProgress instead, once it's actually known.
        let heightConstraint = headerGlass.heightAnchor.constraint(equalToConstant: HeaderMetrics.expandedContentHeight)
        headerHeightConstraint = heightConstraint

        NSLayoutConstraint.activate([
            headerGlass.leadingAnchor.constraint(equalTo: webView.leadingAnchor),
            headerGlass.trailingAnchor.constraint(equalTo: webView.trailingAnchor),
            headerGlass.topAnchor.constraint(equalTo: webView.topAnchor),
            heightConstraint,
        ])

        eyebrowLabel.font = .systemFont(ofSize: 10.5, weight: .semibold)
        eyebrowLabel.textColor = HeaderColors.textMuted

        titleLabel.font = .systemFont(ofSize: HeaderMetrics.titleExpandedSize, weight: .semibold)
        titleLabel.textColor = HeaderColors.textPrimary
        titleLabel.lineBreakMode = .byTruncatingTail
        titleLabel.numberOfLines = 1
        // A long trip name should be the one to truncate under space
        // pressure — the buttons next to it hold their natural size (set
        // below) rather than getting squeezed into wrapping.
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        eyebrowLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let titleGroup = UIStackView(arrangedSubviews: [eyebrowLabel, titleLabel])
        titleGroup.axis = .vertical
        titleGroup.spacing = 4
        titleGroup.alignment = .leading
        titleGroup.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        shareButton.configuration = makeHeaderButtonConfig(title: "Share", systemImage: "square.and.arrow.up")
        shareButton.addTarget(self, action: #selector(shareTapped), for: .touchUpInside)
        shareButton.setContentCompressionResistancePriority(.required, for: .horizontal)

        tripsButton.configuration = makeHeaderButtonConfig(title: "Trips", systemImage: "chevron.left")
        tripsButton.addTarget(self, action: #selector(tripsBackTapped), for: .touchUpInside)
        tripsButton.setContentCompressionResistancePriority(.required, for: .horizontal)

        let buttonsGroup = UIStackView(arrangedSubviews: [shareButton, tripsButton])
        buttonsGroup.axis = .horizontal
        buttonsGroup.spacing = 8
        buttonsGroup.setContentCompressionResistancePriority(.required, for: .horizontal)

        let topRow = UIStackView(arrangedSubviews: [titleGroup, UIView(), buttonsGroup])
        topRow.axis = .horizontal
        topRow.alignment = .top

        statsLabel.font = .monospacedSystemFont(ofSize: 11.5, weight: .regular)
        statsLabel.textColor = HeaderColors.textMuted

        syncDot.layer.cornerRadius = 3.5
        syncDot.translatesAutoresizingMaskIntoConstraints = false

        syncLabel.font = .monospacedSystemFont(ofSize: 11.5, weight: .regular)
        syncLabel.textColor = HeaderColors.textPrimary

        let syncContent = UIStackView(arrangedSubviews: [syncDot, syncLabel])
        syncContent.axis = .horizontal
        syncContent.spacing = 7
        syncContent.alignment = .center
        syncContent.isUserInteractionEnabled = false
        syncContent.translatesAutoresizingMaskIntoConstraints = false

        syncPill.backgroundColor = HeaderColors.textPrimary.withAlphaComponent(0.08)
        syncPill.layer.borderWidth = 1
        syncPill.layer.borderColor = HeaderColors.textPrimary.withAlphaComponent(0.22).cgColor
        syncPill.layer.cornerRadius = 14
        syncPill.translatesAutoresizingMaskIntoConstraints = false
        syncPill.addSubview(syncContent)
        syncPill.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(syncTapped)))
        syncPill.isUserInteractionEnabled = true

        NSLayoutConstraint.activate([
            syncContent.leadingAnchor.constraint(equalTo: syncPill.leadingAnchor, constant: 10),
            syncContent.trailingAnchor.constraint(equalTo: syncPill.trailingAnchor, constant: -10),
            syncContent.topAnchor.constraint(equalTo: syncPill.topAnchor, constant: 5),
            syncContent.bottomAnchor.constraint(equalTo: syncPill.bottomAnchor, constant: -5),
            syncDot.widthAnchor.constraint(equalToConstant: 7),
            syncDot.heightAnchor.constraint(equalToConstant: 7),
        ])

        let statsRow = UIStackView(arrangedSubviews: [statsLabel, UIView(), syncPill])
        statsRow.axis = .horizontal
        statsRow.alignment = .center
        headerStatsRow = statsRow

        let contentStack = UIStackView(arrangedSubviews: [topRow, statsRow])
        contentStack.axis = .vertical
        contentStack.spacing = 10
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        headerGlass.contentView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            contentStack.leadingAnchor.constraint(equalTo: headerGlass.contentView.safeAreaLayoutGuide.leadingAnchor, constant: 20),
            contentStack.trailingAnchor.constraint(equalTo: headerGlass.contentView.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            contentStack.bottomAnchor.constraint(equalTo: headerGlass.contentView.bottomAnchor, constant: -14),
            // Content is bottom-anchored so it collapses toward the compact
            // title as the bar shrinks, but with nothing else constraining
            // its top, a short enough bar would push it up into the status
            // bar/notch — this clamps it so it can never go there.
            contentStack.topAnchor.constraint(greaterThanOrEqualTo: headerGlass.contentView.safeAreaLayoutGuide.topAnchor, constant: 6),
        ])
    }

    private func makeHeaderButtonConfig(title: String, systemImage: String) -> UIButton.Configuration {
        var config = UIButton.Configuration.plain()
        config.image = UIImage(systemName: systemImage, withConfiguration: UIImage.SymbolConfiguration(pointSize: 12, weight: .semibold))
        config.title = title
        // Without this, a long trip name squeezing the buttons row makes
        // the button's own label wrap to two lines ("Shar"/"e") instead of
        // holding its size — titleLabel is the one that should give up
        // space (it already truncates), not these.
        config.titleLineBreakMode = .byTruncatingTail
        config.imagePadding = 5
        config.baseForegroundColor = HeaderColors.textPrimary
        config.background.backgroundColor = HeaderColors.textPrimary.withAlphaComponent(0.06)
        config.background.strokeColor = HeaderColors.textPrimary.withAlphaComponent(0.28)
        config.background.strokeWidth = 1
        config.background.cornerRadius = 8
        config.contentInsets = NSDirectionalEdgeInsets(top: 7, leading: 12, bottom: 7, trailing: 12)
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = .systemFont(ofSize: 12, weight: .medium)
            return outgoing
        }
        return config
    }

    @objc private func shareTapped() {
        webView?.evaluateJavaScript("document.querySelector('[data-action=\"share\"]')?.click();")
    }

    @objc private func tripsBackTapped() {
        webView?.evaluateJavaScript("document.querySelector('[data-action=\"trips-back\"]')?.click();")
    }

    @objc private func syncTapped() {
        webView?.evaluateJavaScript("document.querySelector('[data-action=\"sync\"]')?.click();")
    }

    private func applyHeaderState(_ body: [String: Any]) {
        let visible = body["visible"] as? Bool ?? false
        let modalOpen = body["modalOpen"] as? Bool ?? false
        // Same reasoning as the tab bar: this native layer paints on top
        // of the whole webview, so a web modal's CSS z-index can't cover
        // it on its own — hide the header ourselves while one's open.
        headerGlass.isHidden = !visible || modalOpen

        titleLabel.text = body["tripName"] as? String
        eyebrowLabel.text = (body["eyebrow"] as? String)?.uppercased()

        let memberLabel = body["memberLabel"] as? String ?? ""
        let expenseLabel = body["expenseLabel"] as? String ?? ""
        statsLabel.text = [memberLabel, expenseLabel].filter { !$0.isEmpty }.joined(separator: "   ")

        syncLabel.text = body["syncLabel"] as? String
        syncDot.backgroundColor = syncDotColor(for: body["syncStatus"] as? String ?? "synced")
    }

    private func syncDotColor(for status: String) -> UIColor {
        switch status {
        case "out-of-sync": return HeaderColors.syncOutOfSync
        case "offline": return HeaderColors.syncOffline
        case "session-expired": return HeaderColors.syncExpired
        default: return HeaderColors.syncSynced
        }
    }

    // Continuously interpolates height/font-size/fade as the user scrolls
    // — deliberately not wrapped in UIView.animate, since this fires on
    // every scroll tick and should track the gesture directly, the same
    // way UIKit's own scroll-linked animations (e.g. large title collapse)
    // aren't discrete transitions.
    private func applyHeaderScrollProgress(_ progress: CGFloat) {
        headerScrollProgress = progress
        let contentHeight = HeaderMetrics.expandedContentHeight
            - (HeaderMetrics.expandedContentHeight - HeaderMetrics.collapsedContentHeight) * progress
        let safeTop = webView?.safeAreaInsets.top ?? 0
        headerHeightConstraint?.constant = safeTop + contentHeight

        let titleSize = HeaderMetrics.titleExpandedSize
            - (HeaderMetrics.titleExpandedSize - HeaderMetrics.titleCollapsedSize) * progress
        titleLabel.font = .systemFont(ofSize: titleSize, weight: .semibold)

        let fadeAlpha = 1 - min(progress * 1.6, 1)
        eyebrowLabel.alpha = fadeAlpha
        headerStatsRow?.alpha = fadeAlpha

        // alpha alone doesn't remove these from the stack's own layout —
        // they'd keep occupying their full height even at alpha 0, which
        // is why the collapsed bar was too short for its own content and
        // pushed the buttons up into the status bar. Hiding once they're
        // effectively invisible drops them from the stack's intrinsic
        // size entirely, matching the shrunk box.
        let nearlyCollapsed = progress > 0.85
        if nearlyCollapsed != headerElementsHidden {
            headerElementsHidden = nearlyCollapsed
            // Only this specific transition — not the continuous
            // height/font/alpha updates above — needs animating: toggling
            // isHidden on a stack's arranged subview instantly frees (or
            // reclaims) the space it occupied, snapping the title/buttons
            // to their new position in one frame otherwise.
            UIView.animate(withDuration: 0.2) {
                self.eyebrowLabel.isHidden = nearlyCollapsed
                self.headerStatsRow?.isHidden = nearlyCollapsed
                self.headerGlass.contentView.layoutIfNeeded()
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case navTabsStateHandlerName:
            guard let body = message.body as? [String: Any] else { return }
            let visible = body["visible"] as? Bool ?? false
            let active = body["active"] as? String
            let theme = body["theme"] as? String ?? "light"
            let modalOpen = body["modalOpen"] as? Bool ?? false

            let activeChanged = active != currentActive
            currentTheme = theme
            currentActive = active
            // A web-rendered modal's own CSS z-index can't reach above
            // this native subview — it sits on top of the whole webview
            // regardless — so hide the bar ourselves whenever one's open,
            // or it'd visually cover the modal instead of the other way
            // around.
            glassContainer.isHidden = !visible || modalOpen
            applyTheme(theme, active: active)
            positionSelectionIndicator(for: active, animated: activeChanged)

        case headerStateHandlerName:
            guard let body = message.body as? [String: Any] else { return }
            applyHeaderState(body)

        case headerScrollHandlerName:
            guard let progress = message.body as? NSNumber else { return }
            applyHeaderScrollProgress(CGFloat(progress.doubleValue))

        default:
            break
        }
    }
}
