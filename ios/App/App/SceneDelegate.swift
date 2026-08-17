import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()
    }

    // Forwards OAuth/deep-link redirect URLs (e.g. Google Sign-In callbacks)
    // to Capacitor's real proxy so plugins listening for .capacitorOpenURL
    // still receive them under the scene-based (iOS 13+) app lifecycle.
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let context = URLContexts.first else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [
            .sourceApplication: context.options.sourceApplication as Any,
            .annotation: context.options.annotation as Any,
            .openInPlace: context.options.openInPlace
        ])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
