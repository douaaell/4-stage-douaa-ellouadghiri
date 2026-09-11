import sys, os
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(".")))
os.chdir(os.path.abspath("."))

try:
    from app.rag.chain import generate_response
    print("Testing generate_response...")
    result = generate_response("Quel est le seuil d'activation du blocage")
    print("Result:", result)
except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
