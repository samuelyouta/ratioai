import Capacitor
import UIKit

/// Keeps the Capacitor WebView locked at 1× scale (OAuth browser / input focus can zoom WKWebView).
class BridgeViewController: CAPBridgeViewController {
    private var zoomResetObserver: NSObjectProtocol?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        lockWebViewZoom()
        zoomResetObserver = NotificationCenter.default.addObserver(
            forName: Notification.Name("RatioAiResetWebViewZoom"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.lockWebViewZoom()
        }
    }

    deinit {
        if let zoomResetObserver {
            NotificationCenter.default.removeObserver(zoomResetObserver)
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        lockWebViewZoom()
    }

    private func lockWebViewZoom() {
        guard let scrollView = webView?.scrollView else { return }
        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 1.0
        if scrollView.zoomScale != 1.0 {
            scrollView.setZoomScale(1.0, animated: false)
        }
    }
}
