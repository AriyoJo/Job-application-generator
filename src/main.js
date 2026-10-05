const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { initializeDatabase, closeDatabase } = require('./database');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Electron Forge dengan Vite plugin mengompilasi preload ke preload.cjs
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, 'preload.js');

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    webPreferences: {
      preload: preloadPath,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

app.whenReady().then(() => {
  initializeDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('print-document', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win) return { success: false };

  return new Promise((resolve) => {
    win.webContents.print(
      { printBackground: true },
      (success, failureReason) => {
        resolve({ success, failureReason });
      },
    );
  });
});

ipcMain.handle('save-document-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win || win.isDestroyed()) {
    return { success: false, error: 'Jendela aplikasi tidak tersedia.' };
  }

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Simpan Surat Lamaran sebagai PDF',
    defaultPath: 'Surat-Lamaran-Kerja.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  try {
    // Tunggu proses rendering halaman selesai sebelum membuat PDF.
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        if (document.readyState === 'complete') {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        } else {
          window.addEventListener('load', () => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          }, { once: true });
        }
      })
    `);

    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });

    if (!pdf || pdf.length === 0) {
      throw new Error('PDF yang dihasilkan kosong.');
    }

    await fs.promises.writeFile(filePath, pdf);

    return { success: true, filePath };
  } catch (error) {
    console.error('Gagal membuat PDF:', error);
    return { success: false, error: error.message };
  }
});

function getDatabase() {
  return initializeDatabase();
}

function validateProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Data profil tidak valid.');
  }

  const fields = [
    'profile_name',
    'full_name',
    'birth_place',
    'birth_date',
    'education',
    'address',
    'phone',
    'email',
  ];

  const profile = {};

  for (const field of fields) {
    const value = input[field] ?? '';

    if (typeof value !== 'string') {
      throw new Error(`Kolom ${field} harus berupa teks.`);
    }

    profile[field] = value.trim();
  }

  if (!profile.profile_name) {
    throw new Error('Nama profil wajib diisi.');
  }

  if (!profile.full_name) {
    throw new Error('Nama lengkap wajib diisi.');
  }

  return profile;
}

function validateProfileId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('ID profil tidak valid.');
  }
}

ipcMain.handle('profiles:list', () => {
  return getDatabase()
    .prepare(`
      SELECT *
      FROM applicant_profiles
      ORDER BY profile_name COLLATE NOCASE ASC
    `)
    .all();
});

ipcMain.handle('profiles:create', (_event, input) => {
  const profile = validateProfile(input);

  const result = getDatabase()
    .prepare(`
      INSERT INTO applicant_profiles (
        profile_name,
        full_name,
        birth_place,
        birth_date,
        education,
        address,
        phone,
        email
      ) VALUES (
        @profile_name,
        @full_name,
        @birth_place,
        @birth_date,
        @education,
        @address,
        @phone,
        @email
      )
    `)
    .run(profile);

  return getDatabase()
    .prepare('SELECT * FROM applicant_profiles WHERE id = ?')
    .get(Number(result.lastInsertRowid));
});

ipcMain.handle('profiles:update', (_event, id, input) => {
  validateProfileId(id);
  const profile = validateProfile(input);

  const result = getDatabase()
    .prepare(`
      UPDATE applicant_profiles
      SET
        profile_name = @profile_name,
        full_name = @full_name,
        birth_place = @birth_place,
        birth_date = @birth_date,
        education = @education,
        address = @address,
        phone = @phone,
        email = @email,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    .run({ ...profile, id });

  if (result.changes === 0) {
    throw new Error('Profil tidak ditemukan.');
  }

  return getDatabase()
    .prepare('SELECT * FROM applicant_profiles WHERE id = ?')
    .get(id);
});

ipcMain.handle('profiles:delete', (_event, id) => {
  validateProfileId(id);

  const result = getDatabase()
    .prepare('DELETE FROM applicant_profiles WHERE id = ?')
    .run(id);

  if (result.changes === 0) {
    throw new Error('Profil tidak ditemukan.');
  }

  return { success: true };
});

app.on('before-quit', () => {
  closeDatabase();
});
