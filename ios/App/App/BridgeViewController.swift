import Capacitor
import UIKit

/// Starts the Capacitor WebView at 1×, then allows pinch zoom in and out.
class BridgeViewController: CAPBridgeViewController {
    private let minZoom: CGFloat = 1.0
    private let maxZoom: CGFloat = 5.0

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        configureWebViewZoom(resetToDefault: true)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        configureWebViewZoom(resetToDefault: false)
    }

    private func configureWebViewZoom(resetToDefault: Bool) {
        guard let scrollView = webView?.scrollView else { return }
        scrollView.minimumZoomScale = minZoom
        scrollView.maximumZoomScale = maxZoom
        scrollView.pinchGestureRecognizer?.isEnabled = true
        scrollView.bouncesZoom = true
        if resetToDefault, scrollView.zoomScale != minZoom {
            scrollView.setZoomScale(minZoom, animated: false)
        }
    }
}
