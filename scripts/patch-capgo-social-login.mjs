/**
 * Patch @capgo/capacitor-social-login iOS presentation anchors.
 * Uses Capacitor bridge window + scene key window instead of deprecated
 * UIApplication.shared.windows.first (causes Apple crash / error 1000).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iosSrc = path.join(
  root,
  "node_modules/@capgo/capacitor-social-login/ios/Sources/SocialLoginPlugin",
);

const KEY_WINDOW_HELPER = `
    private func ratioKeyWindow() -> UIWindow? {
        if #available(iOS 13.0, *) {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            if let key = scenes.flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) {
                return key
            }
            if let any = scenes.flatMap({ $0.windows }).first {
                return any
            }
        }
        return UIApplication.shared.windows.first { $0.isKeyWindow } ?? UIApplication.shared.windows.first
    }

    private func ratioTopViewController(from root: UIViewController?) -> UIViewController? {
        if let nav = root as? UINavigationController {
            return ratioTopViewController(from: nav.visibleViewController)
        }
        if let tab = root as? UITabBarController {
            return ratioTopViewController(from: tab.selectedViewController)
        }
        if let presented = root?.presentedViewController {
            return ratioTopViewController(from: presented)
        }
        return root
    }
`;

function patchApple(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = fs.readFileSync(filePath, "utf8");

  if (!src.includes("private weak var ratioPresentationWindow")) {
    const classMarker = "class AppleProvider: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {";
    if (!src.includes(classMarker)) {
      console.warn("AppleProvider: class marker not found");
      return false;
    }
    src = src.replace(
      classMarker,
      `${classMarker}
    private weak var ratioPresentationWindow: UIWindow?

    func setPresentationWindow(_ window: UIWindow?) {
        self.ratioPresentationWindow = window
    }
`,
    );
  }

  const oldAnchor = `    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first!
    }`;

  const brokenPatch = `    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = ratioKeyWindow() {
            return window
        }
        // Last resort — never force-unwrap a missing window (causes ASAuthorizationError 1000).
        return UIWindow(frame: UIScreen.main.bounds)
    }`;

  const newAnchor = `    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = ratioPresentationWindow ?? ratioKeyWindow() {
            return window
        }
        // Match SocialLoginPlugin — do not allocate a new UIWindow (can crash the app).
        return ASPresentationAnchor()
    }`;

  if (src.includes(oldAnchor)) {
    src = src.replace(oldAnchor, newAnchor);
  } else if (src.includes(brokenPatch)) {
    src = src.replace(brokenPatch, newAnchor);
  } else if (!src.includes("ratioPresentationWindow ?? ratioKeyWindow()")) {
    console.warn("AppleProvider: presentationAnchor block not found; skip");
    return false;
  }

  if (!src.includes("private func ratioKeyWindow()")) {
    const insertBefore = "    private func persistName(userId: String";
    if (src.includes(insertBefore)) {
      src = src.replace(insertBefore, `${KEY_WINDOW_HELPER}\n${insertBefore}`);
    }
  }

  fs.writeFileSync(filePath, src);
  console.log("Patched AppleProvider presentationAnchor");
  return true;
}

function patchGoogle(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = fs.readFileSync(filePath, "utf8");
  if (src.includes("ratioKeyWindow()") && src.includes("ratioTopViewController")) {
    console.log("GoogleProvider already patched");
    return true;
  }

  const oldGuard = `                guard let presentingVc = UIApplication.shared.windows.first?.rootViewController else {
                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller found"])))
                    return
                }`;

  const newGuard = `                guard let window = self.ratioKeyWindow(),
                      let presentingVc = self.ratioTopViewController(from: window.rootViewController) else {
                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller found"])))
                    return
                }`;

  if (!src.includes(oldGuard)) {
    console.warn("GoogleProvider: expected presentingVc guard not found; skip");
    return false;
  }
  src = src.replace(oldGuard, newGuard);

  const logoutMarker = `    func logout(completion: @escaping (Result<Void, Error>) -> Void) {`;
  if (!src.includes(logoutMarker)) {
    console.warn("GoogleProvider: logout marker not found; skip helper inject");
    return false;
  }
  src = src.replace(logoutMarker, `${KEY_WINDOW_HELPER}\n${logoutMarker}`);

  fs.writeFileSync(filePath, src);
  console.log("Patched GoogleProvider presenting view controller");
  return true;
}

function patchSocialLoginPlugin(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = fs.readFileSync(filePath, "utf8");

  const oldAppleLogin = `            apple.login(payload: payload) { (result: Result<AppleProviderResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }`;

  const newAppleLogin = `            if let window = self.bridge?.viewController?.view.window {
                self.apple.setPresentationWindow(window)
            }
            apple.login(payload: payload) { (result: Result<AppleProviderResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }`;

  if (src.includes("self.apple.setPresentationWindow(window)")) {
    console.log("SocialLoginPlugin already patched for Apple window");
    return true;
  }
  if (!src.includes(oldAppleLogin)) {
    console.warn("SocialLoginPlugin: apple login block not found; skip");
    return false;
  }
  src = src.replace(oldAppleLogin, newAppleLogin);
  fs.writeFileSync(filePath, src);
  console.log("Patched SocialLoginPlugin to pass Capacitor bridge window to Apple");
  return true;
}

const appleOk = patchApple(path.join(iosSrc, "AppleProvider.swift"));
const googleOk = patchGoogle(path.join(iosSrc, "GoogleProvider.swift"));
const pluginOk = patchSocialLoginPlugin(path.join(iosSrc, "SocialLoginPlugin.swift"));
if (!appleOk || !googleOk || !pluginOk) {
  console.warn("One or more Capgo social-login patches did not apply. Native auth may still fail on device.");
}
