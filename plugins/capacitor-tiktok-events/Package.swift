// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorTiktokEvents",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorTiktokEvents",
            targets: ["TikTokEventsPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/tiktok/tiktok-business-ios-sdk.git", exact: "1.7.2")
    ],
    targets: [
        .target(
            name: "TikTokEventsPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "TikTokBusinessSDK", package: "tiktok-business-ios-sdk")
            ],
            path: "ios/Sources/TikTokEventsPlugin")
    ]
)
