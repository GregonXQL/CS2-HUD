"""Frozen backend entry point. Settings come from the desktop launcher."""
import os
import threading
import ctypes
import uvicorn
from app.config import Settings
from app.main import app


def watch_parent():
    # Avoid leaving the server running if Electron crashes or is terminated.
    pid = int(os.environ.get('DESKTOP_PARENT_PID', '0'))
    if os.name == 'nt' and pid:
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.OpenProcess.restype = ctypes.c_void_p
        kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        handle = kernel.OpenProcess(0x00100000, False, pid)
        if not handle:
            os._exit(0)
        kernel.WaitForSingleObject(handle, 0xFFFFFFFF)
        kernel.CloseHandle(handle)
        os._exit(0)


if __name__ == '__main__':
    threading.Thread(target=watch_parent, daemon=True).start()
    settings = Settings()
    uvicorn.run(app, host=settings.host, port=settings.port, loop='asyncio', http='h11', ws='websockets')
