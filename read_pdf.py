import fitz  # PyMuPDF

def read_pdf(file_path):
    doc = fitz.open(file_path)
    
    # Check random pages
    for i in [20, 50, 100, 200, 300, 400]:
        page = doc.load_page(i)
        text = page.get_text()
        print(f"--- Page {i} ---")
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            for line in lines[:30]:
                print(line)
        else:
            print("No text found.")

if __name__ == "__main__":
    read_pdf("hu_kegyes_Koran_magyar.pdf")
