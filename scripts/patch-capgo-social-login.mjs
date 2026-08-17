/**
 * Patch @capgo/capacitor-social-login iOS presentation anchors.
 * UIApplication.shared.windows.first is unreliable on modern iOS (scenes),
 * which causes Apple ASAuthorizationError 1000 and Google sign-in hangs.
 *
 * Runs on postinstall so Cap sync picks up the fixed sources.
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
  if (src.includes("ratioKeyWindow()")) {
    console.log("AppleProvider already patched");
    return true;
  }

  const oldAnchor = `    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first!
    }`;

  const newAnchor = `    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = ratioKeyWindow() {
            return window
        }
        // Last resort — never force-unwrap a missing window (causes ASAuthorizationError 1000).
        return UIWindow(frame: UIScreen.main.bounds)
    }

${KEY_WINDOW_HELPER}`;

  if (!src.includes(oldAnchor)) {
    console.warn("AppleProvider: expected presentationAnchor block not found; skip");
    return false;
  }
  src = src.replace(oldAnchor, newAnchor);
  fs.writeFileSync(filePath, src);
  console.log("Patched AppleProvider presentationAnchor");
  return true;
}

function patchGoogle(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = fs.readFileSync(filePath, "utf8");
  if (src.includes("ratioKeyWindow()")) {
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

  // Insert helpers before the closing of the class — find last closing brace of file's GoogleProvider class.
  // Safer: append helpers just before `func logout`.
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

const appleOk = patchApple(path.join(iosSrc, "AppleProvider.swift"));
const googleOk = patchGoogle(path.join(iosSrc, "GoogleProvider.swift"));
if (!appleOk || !googleOk) {
  console.warn("One or more Capgo social-login patches did not apply. Native auth may still fail on device.");
  process.exitCode = 0; // don't break installs
}
