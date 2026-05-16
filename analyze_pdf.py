import fitz  # PyMuPDF

def analyze_pdf(file_path):
    doc = fitz.open(file_path)
    page = doc.load_page(50)
    
    print("Text:", bool(page.get_text()))
    print("Images:", len(page.get_images()))
    print("Drawings:", len(page.get_drawings()))
    
    # Check what kind of text we get with "rawdict"
    blocks = page.get_text("rawdict")["blocks"]
    text_blocks = [b for b in blocks if b["type"] == 0]
    print("Text blocks count:", len(text_blocks))

if __name__ == "__main__":
    analyze_pdf("hu_kegyes_Koran_magyar.pdf")
