import io
import logging

try:
    import pypdf
except ImportError:
    pypdf = None

logger = logging.getLogger(__name__)

class DocumentParser:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """
        Attempts to extract text from a PDF file using pypdf.
        If pypdf is not available or extraction yields no text, returns empty string.
        """
        if not pypdf:
            logger.warning("pypdf is not installed. Skipping PDF text extraction.")
            return ""

        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_blocks = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_blocks.append(f"--- Page {i+1} ---\n{page_text}")
            
            return "\n\n".join(text_blocks)
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            return ""

    @staticmethod
    def is_image(content_type: str) -> bool:
        return content_type.startswith("image/")
