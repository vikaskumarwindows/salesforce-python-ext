"""
Cross-Platform Chrome Extension Bundler for In-Browser Pyodide Extension.
Packages the extension directory into a clean, store-ready ZIP archive.
"""
import os
import sys
import zipfile

def bundle():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    extension_dir = os.path.join(root_dir, "extension")
    dist_dir = os.path.join(root_dir, "dist")
    zip_path = os.path.join(dist_dir, "python-in-browser-analytics.zip")

    os.makedirs(dist_dir, exist_ok=True)

    print("=== Chrome Extension Bundler ===")
    print(f"Source Directory: {extension_dir}")
    print(f"Output File:     {zip_path}\n")

    excluded_names = {".DS_Store", "Thumbs.db", ".git", ".gitignore", "__pycache__"}
    excluded_exts = {".tmp", ".bak"}

    total_files = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(extension_dir):
            dirs[:] = [d for d in dirs if d not in excluded_names]

            for file in files:
                if file in excluded_names:
                    continue
                if any(file.endswith(ext) for ext in excluded_exts):
                    continue

                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, extension_dir)
                zipf.write(abs_path, arcname=rel_path)
                total_files += 1
                print(f"  + Added: {rel_path}")

    size_kb = os.path.getsize(zip_path) / 1024.0
    print("\n" + "=" * 45)
    print(" [SUCCESS] Extension packaged successfully!")
    print(f" Archive: {zip_path}")
    print(f" Files:   {total_files}")
    print(f" Size:    {size_kb:.2f} KB")
    print("=" * 45)

if __name__ == "__main__":
    bundle()
