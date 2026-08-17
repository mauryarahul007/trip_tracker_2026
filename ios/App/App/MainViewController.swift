import UIKit
import WebKit
import Capacitor

// Renders the app's bottom nav as a genuine native "Liquid Glass" floating
// tab bar (UIVisualEffectView + UIGlassEffect on iOS 26+) with real
// UIButtons for the icons/labels, instead of the CSS .nav-tabs element.
//
// Putting a native blur *behind* CSS-rendered icons blurs the icons too —
// WKWebView flattens everything into one layer, and the blur view samples
// whatever's in that rect indiscriminately. Crisp icons over a real native
// blur requires the icons themselves to be native views layered on top.
//
// .nav-tabs stays in the DOM (invisible — see html.capacitor-ios .nav-tabs
// in index.css) purely as the source of truth: tapping a native button
// calls .click() on the matching web button so the existing React
// handlers/state are untouched, and .nav-tabs' own visibility/.active
// class/data-theme are read back by nativeShell.ts and posted here via
// the "navTabsState" message — since a few flows in App.tsx switch tabs
// programmatically (not just nav-bar taps), native can't just assume
// whichever button it tapped is now the active one; it mirrors web state
// rather than owning it.
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

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private let navTabsStateHandlerName = "navTabsState"
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

    override func viewDidLoad() {
        super.viewDidLoad()
        // CAPBridgeViewController.prepareWebView() overwrites
        // webViewConfiguration(for:)'s userContentController with its own
        // instance right after calling that override, so registering the
        // message handler there gets silently discarded. Register it here
        // instead, against the webview's actual final controller, which
        // exists once viewDidLoad runs (after loadView() has already built
        // the real webView).
        webView?.configuration.userContentController.add(self, name: navTabsStateHandlerName)
        setUpTabBar()
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: navTabsStateHandlerName)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Button frames (which the indicator targets) are only valid after
        // a layout pass — reposition without animating, since this fires on
        // every layout change (including rotation), not just tab switches.
        positionSelectionIndicator(for: currentActive, animated: false)
    }

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

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == navTabsStateHandlerName,
              let body = message.body as? [String: Any] else { return }

        let visible = body["visible"] as? Bool ?? false
        let active = body["active"] as? String
        let theme = body["theme"] as? String ?? "light"

        let activeChanged = active != currentActive
        currentTheme = theme
        currentActive = active
        glassContainer.isHidden = !visible
        applyTheme(theme, active: active)
        positionSelectionIndicator(for: active, animated: activeChanged)
    }
}
