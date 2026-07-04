import PurchasesHybridCommon

/// Native RevenueCat bootstrap for the Capacitor shell (called from AppDelegate).
public enum RatioAiRevenueCat {
    public static func configure(apiKey: String) {
        #if DEBUG
        Purchases.logLevel = .debug
        #endif
        Purchases.configure(withAPIKey: apiKey)
    }
}

public let isCapacitorApp = true
