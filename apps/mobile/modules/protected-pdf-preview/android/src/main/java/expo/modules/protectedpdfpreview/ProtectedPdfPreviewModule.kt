package expo.modules.protectedpdfpreview

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class ProtectedPdfPreviewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ProtectedPdfPreview")

    AsyncFunction("getPageCount") Coroutine { pdfUri: String ->
      withContext(Dispatchers.IO) {
        val source = protectedPdfFile(pdfUri)
        val descriptor = ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY)
        try {
          PdfRenderer(descriptor).use { it.pageCount }
        } finally {
          descriptor.close()
        }
      }
    }

    AsyncFunction("renderPage") Coroutine { pdfUri: String, pageIndex: Int, requestedWidth: Int, outputDirectory: String ->
      withContext(Dispatchers.IO) {
        require(pageIndex >= 0) { "Invalid PDF page." }
        val source = protectedPdfFile(pdfUri)
        val outputDir = cacheDirectory(outputDirectory)
        val descriptor = ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY)
        try {
          PdfRenderer(descriptor).use { renderer ->
            require(pageIndex < renderer.pageCount) { "PDF page does not exist." }
            renderer.openPage(pageIndex).use { page ->
              val maxWidth = requestedWidth.coerceIn(320, 1800)
              val ratio = minOf(maxWidth.toFloat() / page.width.toFloat(), 2400f / page.height.toFloat())
              val bitmapWidth = (page.width * ratio).toInt().coerceAtLeast(320)
              val bitmapHeight = (page.height * ratio).toInt().coerceAtLeast(320)
              val bitmap = Bitmap.createBitmap(bitmapWidth, bitmapHeight, Bitmap.Config.ARGB_8888)
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              val output = File(outputDir, "3bigha-pdf-page-${UUID.randomUUID()}.png")
              FileOutputStream(output).use { stream ->
                check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) { "Could not render this PDF page." }
              }
              bitmap.recycle()
              Uri.fromFile(output).toString()
            }
          }
        } finally {
          descriptor.close()
        }
      }
    }
  }

  private fun protectedPdfFile(uri: String): File {
    val file = File(Uri.parse(uri).path ?: throw IllegalArgumentException("Invalid local PDF file.")).canonicalFile
    val cacheRoot = (appContext.cacheDirectory ?: throw IllegalStateException("App cache is unavailable.")).canonicalFile
    require(file.path.startsWith(cacheRoot.path + File.separator)) { "PDF is outside private app storage." }
    require(file.isFile && file.name.startsWith("3bigha-protected-") && file.extension.equals("pdf", true)) {
      "Only protected PDF attachments can be previewed."
    }
    return file
  }

  private fun cacheDirectory(uri: String): File {
    val path = Uri.parse(uri).path ?: throw IllegalArgumentException("Invalid private cache directory.")
    val directory = File(path).canonicalFile
    val cacheRoot = (appContext.cacheDirectory ?: throw IllegalStateException("App cache is unavailable.")).canonicalFile
    require(directory.path == cacheRoot.path || directory.path.startsWith(cacheRoot.path + File.separator)) { "Preview output must remain inside private app storage." }
    check(directory.isDirectory) { "Private app cache is unavailable." }
    return directory
  }
}
