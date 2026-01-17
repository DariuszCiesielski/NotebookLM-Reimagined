import sys
from pathlib import Path

# Add parent directory to Python path so we can import from app/
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

# Export FastAPI app for Vercel Python runtime
app = app
