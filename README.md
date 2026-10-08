# Startup Commands

### Start Backend
Run from the root `labour gram` folder:
```powershell
# Windows
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend
Open a second terminal from the root `labour gram` folder:
```powershell
# Windows
cd frontend
python -m http.server 5500
```

Then open **http://localhost:5500** in your browser.
Backend API docs available at **http://localhost:8000/docs**.

### Start Both (Linux VPS - Single Command)
```bash
(cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 &) && (cd frontend && python3 -m http.server 5500)
```

### Clear Database (Reset Data)
If you ever need to completely wipe the database and start fresh, run this from the `backend` folder:
```powershell
# Windows
Remove-Item labourgram.db
alembic upgrade head
```
```bash
# Linux
rm labourgram.db
alembic upgrade head
```
