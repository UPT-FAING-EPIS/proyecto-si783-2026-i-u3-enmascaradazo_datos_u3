import os
import urllib.request
import sys

def compile_puml(file_path):
    png_path = os.path.splitext(file_path)[0] + '.png'
    print(f"Compiling {file_path} -> {png_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()
        
        # Ensure it has start/end tags
        if not code.strip().startswith('@start'):
            code = '@startuml\n' + code + '\n@enduml'

        url = 'https://kroki.io/plantuml/png'
        data = code.encode('utf-8')
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={
                'Content-Type': 'text/plain',
                'User-Agent': 'Mozilla/5.0'
            }
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            png_bytes = response.read()
        
        with open(png_path, 'wb') as f_out:
            f_out.write(png_bytes)
        print(f"Successfully compiled {file_path}")
        return True
    except Exception as e:
        print(f"Error compiling {file_path}: {e}", file=sys.stderr)
        return False

def main():
    docs_dir = 'docs'
    compiled_count = 0
    failed_count = 0
    for root, dirs, files in os.walk(docs_dir):
        for file in files:
            if file.endswith('.puml') or file.endswith('.plantuml'):
                full_path = os.path.join(root, file)
                if compile_puml(full_path):
                    compiled_count += 1
                else:
                    failed_count += 1
    print(f"\nCompilation finished: {compiled_count} succeeded, {failed_count} failed.")

if __name__ == '__main__':
    main()
