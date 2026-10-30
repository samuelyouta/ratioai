import Foundation
import Capacitor
import TikTokBusinessSDK

/// Thin bridge to the TikTok App Events SDK.
///
/// The web layer decides when to start the SDK (after the App Tracking
/// Transparency prompt) and which events to send. Automatic payment tracking is
/// turned off so purchases are reported once, with the price RevenueCat gives us.
@objc(TikTokEventsPlugin)
public class TikTokEventsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TikTokEventsPlugin"
    public let jsName = "TikTokEvents"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trackEvent", returnType: CAPPluginReturnPromise)
    ]

    @objc func initialize(_ call: CAPPluginCall) {
        guard let accessToken = call.getString("accessToken"), !accessToken.isEmpty,
              let appId = call.getString("appId"), !appId.isEmpty,
              let tiktokAppId = call.getString("tiktokAppId"), !tiktokAppId.isEmpty else {
            call.reject("accessToken, appId and tiktokAppId are required")
            return
        }
        let debug = call.getBool("debug") ?? false

        DispatchQueue.main.async {
            if TikTokBusiness.isInitialized() {
                call.resolve()
                return
            }
            guard let config = TikTokConfig(accessToken: accessToken, appId: appId, tiktokAppId: tiktokAppId) else {
                call.reject("Invalid TikTok configuration")
                return
            }
            config.disablePaymentTracking()
            if debug {
                config.enableDebugMode()
            }
            TikTokBusiness.initializeSdk(config) { success, error in
                if success {
                    call.resolve()
                } else {
                    call.reject(error?.localizedDescription ?? "TikTok SDK failed to start")
                }
            }
        }
    }

    @objc func trackEvent(_ call: CAPPluginCall) {
        guard let name = call.getString("event"), !name.isEmpty else {
            call.reject("event is required")
            return
        }
        var properties: [AnyHashable: Any] = [:]
        if let raw = call.getObject("properties") {
            for (key, value) in raw {
                properties[key] = value
            }
        }
        let eventId = call.getString("eventId")

        DispatchQueue.main.async {
            guard TikTokBusiness.isInitialized() else {
                call.reject("TikTok SDK is not initialized")
                return
            }
            let event = TikTokBaseEvent(eventName: name, properties: properties, eventId: eventId)
            TikTokBusiness.trackTTEvent(event)
            call.resolve()
        }
    }
}
