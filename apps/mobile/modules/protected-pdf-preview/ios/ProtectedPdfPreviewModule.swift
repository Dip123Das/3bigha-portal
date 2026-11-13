import ExpoModulesCore
import PDFKit
import UIKit

public final class ProtectedPdfPreviewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ProtectedPdfPreview")

    AsyncFunction("getPageCount") { (pdfUri: String) -> Int in
      let file = try self.protectedPdfFile(pdfUri)
      guard let document = PDFDocument(url: file) else {
        throw NSError(domain: "ProtectedPdfPreview", code: 1, userInfo: [NSLocalizedDescriptionKey: "The protected PDF could not be read."])
      }
      return document.pageCount
    }

    AsyncFunction("renderPage") { (pdfUri: String, pageIndex: Int, requestedWidth: Int, outputDirectory: String) -> String in
      let file = try self.protectedPdfFile(pdfUri)
      let output = try self.cacheDirectory(outputDirectory)
      guard let document = PDFDocument(url: file), let page = document.page(at: pageIndex) else {
        throw NSError(domain: "ProtectedPdfPreview", code: 2, userInfo: [NSLocalizedDescriptionKey: "This PDF page could not be opened."])
      }
      let bounds = page.bounds(for: .mediaBox)
      let width = CGFloat(max(320, min(requestedWidth, 1800)))
      let scale = min(width / max(bounds.width, 1), 2400 / max(bounds.height, 1))
      let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
      let renderer = UIGraphicsImageRenderer(size: size)
      let image = renderer.image { context in
        context.cgContext.setFillColor(UIColor.white.cgColor)
        context.cgContext.fill(CGRect(origin: .zero, size: size))
        context.cgContext.translateBy(x: 0, y: size.height)
        context.cgContext.scaleBy(x: scale, y: -scale)
        page.draw(with: .mediaBox, to: context.cgContext)
      }
      let destination = output.appendingPathComponent("3bigha-pdf-page-\(UUID().uuidString).png")
      guard let data = image.pngData() else {
        throw NSError(domain: "ProtectedPdfPreview", code: 3, userInfo: [NSLocalizedDescriptionKey: "This PDF page could not be rendered."])
      }
      try data.write(to: destination, options: .atomic)
      return destination.absoluteString
    }
  }

  private func protectedPdfFile(_ uri: String) throws -> URL {
    guard let url = URL(string: uri), url.isFileURL else {
      throw NSError(domain: "ProtectedPdfPreview", code: 4, userInfo: [NSLocalizedDescriptionKey: "The PDF must be stored in private app storage."])
    }
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].standardizedFileURL.path
    let path = url.standardizedFileURL.path
    guard path.hasPrefix(caches + "/"), url.lastPathComponent.hasPrefix("3bigha-protected-"), url.pathExtension.lowercased() == "pdf" else {
      throw NSError(domain: "ProtectedPdfPreview", code: 5, userInfo: [NSLocalizedDescriptionKey: "Only protected PDF attachments can be previewed."])
    }
    return url
  }

  private func cacheDirectory(_ uri: String) throws -> URL {
    guard let url = URL(string: uri), url.isFileURL else {
      throw NSError(domain: "ProtectedPdfPreview", code: 6, userInfo: [NSLocalizedDescriptionKey: "Invalid private cache directory."])
    }
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].standardizedFileURL.path
    guard url.standardizedFileURL.path.hasPrefix(caches + "/"), FileManager.default.fileExists(atPath: url.path) else {
      throw NSError(domain: "ProtectedPdfPreview", code: 7, userInfo: [NSLocalizedDescriptionKey: "Preview output must remain in private app storage."])
    }
    return url
  }
}
