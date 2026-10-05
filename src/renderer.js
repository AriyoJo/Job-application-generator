import './index.css';

const letterForm = document.getElementById('letter-form');

const companyInput = document.getElementById('company');
const positionInput = document.getElementById('position');
const dateInput = document.getElementById('date');

const previewCompany = document.getElementById('preview-company');
const previewCompanyBody = document.getElementById('preview-company-body');
const previewPosition = document.getElementById('preview-position');
const previewDate = document.getElementById('preview-date');

const profileSelect = document.getElementById('profile-select');
const profileForm = document.getElementById('profile-form');
const saveProfileButton = document.getElementById('save-profile-button');
const newProfileButton = document.getElementById('new-profile-button');
const deleteProfileButton = document.getElementById('delete-profile-button');

const profileFields = {
  profile_name: document.getElementById('profile-name'),
  full_name: document.getElementById('full-name'),
  birth_place: document.getElementById('birth-place'),
  birth_date: document.getElementById('birth-date'),
  education: document.getElementById('education'),
  address: document.getElementById('address'),
  phone: document.getElementById('phone'),
  email: document.getElementById('email'),
};

const profilePreview = {
  full_name: document.getElementById('preview-full-name'),
  birth: document.getElementById('preview-birth'),
  education: document.getElementById('preview-education'),
  address: document.getElementById('preview-address'),
  phone: document.getElementById('preview-phone'),
  signature: document.getElementById('preview-signature'),
};

let selectedProfileId = null;
let profiles = [];

function showError(message) {
  alert(message);
}

function formatDate(value) {
  if (!value) return '';

  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function updateLetterPreview() {
  const company = companyInput.value.trim() || '[Nama Perusahaan]';
  const position = positionInput.value.trim() || '[Posisi Pekerjaan]';

  previewCompany.textContent = company;
  previewCompanyBody.textContent = company;
  previewPosition.textContent = position;
  previewDate.textContent = formatDate(dateInput.value);

  const fullName = profileFields.full_name.value.trim();
  const birthPlace = profileFields.birth_place.value.trim();
  const birthDate = formatDate(profileFields.birth_date.value);
  const education = profileFields.education.value.trim();
  const address = profileFields.address.value.trim();
  const phone = profileFields.phone.value.trim();

  profilePreview.full_name.textContent = fullName || '[Nama Lengkap]';

  const birthParts = [birthPlace, birthDate].filter(Boolean);
  profilePreview.birth.textContent =
    birthParts.join(', ') || '[Tempat, Tanggal Lahir]';

  profilePreview.education.textContent = education || '[Pendidikan Terakhir]';

  profilePreview.address.textContent = address || '[Alamat]';
  profilePreview.phone.textContent = phone || '[Nomor Telepon]';
  profilePreview.signature.textContent = fullName || '[Nama Lengkap]';
}

function clearProfileForm() {
  selectedProfileId = null;
  profileForm.reset();

  profileSelect.value = '';
  saveProfileButton.textContent = 'Simpan profil';
  deleteProfileButton.disabled = true;

  updateLetterPreview();
}

function fillProfileForm(profile) {
  selectedProfileId = profile.id;

  for (const [field, input] of Object.entries(profileFields)) {
    input.value = profile[field] ?? '';
  }

  profileSelect.value = String(profile.id);
  saveProfileButton.textContent = 'Perbarui profil';
  deleteProfileButton.disabled = false;

  updateLetterPreview();
}

async function loadProfiles(selectedId = null) {
  if (!window.documentAPI?.profiles) {
    throw new Error(
      'API profil belum tersedia. Periksa src/preload.js dan jalankan ulang aplikasi.',
    );
  }

  profiles = await window.documentAPI.profiles.list();

  profileSelect.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Pilih profil pelamar --';
  profileSelect.appendChild(placeholder);

  for (const profile of profiles) {
    const option = document.createElement('option');
    option.value = String(profile.id);
    option.textContent = profile.profile_name;
    profileSelect.appendChild(option);
  }

  if (selectedId !== null) {
    const selectedProfile = profiles.find(
      (profile) => profile.id === selectedId,
    );

    if (selectedProfile) {
      fillProfileForm(selectedProfile);
      return;
    }
  }

  clearProfileForm();
}

profileSelect.addEventListener('change', () => {
  const id = Number(profileSelect.value);

  if (!profileSelect.value) {
    clearProfileForm();
    return;
  }

  const profile = profiles.find((item) => item.id === id);

  if (profile) {
    fillProfileForm(profile);
  }
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const profile = {};

  for (const [field, input] of Object.entries(profileFields)) {
    profile[field] = input.value.trim();
  }

  try {
    let savedProfile;

    if (selectedProfileId === null) {
      savedProfile = await window.documentAPI.profiles.create(profile);
    } else {
      savedProfile = await window.documentAPI.profiles.update(
        selectedProfileId,
        profile,
      );
    }

    await loadProfiles(savedProfile.id);
    alert('Profil berhasil disimpan.');
  } catch (error) {
    console.error('Gagal menyimpan profil:', error);
    showError(`Gagal menyimpan profil: ${error.message}`);
  }
});

newProfileButton.addEventListener('click', () => {
  clearProfileForm();
  profileFields.profile_name.focus();
});

deleteProfileButton.addEventListener('click', async () => {
  if (selectedProfileId === null) {
    showError('Pilih profil yang ingin dihapus terlebih dahulu.');
    return;
  }

  const confirmed = confirm(
    'Hapus profil ini secara permanen? Tindakan ini tidak dapat dibatalkan.',
  );

  if (!confirmed) return;

  try {
    await window.documentAPI.profiles.delete(selectedProfileId);
    await loadProfiles();
    alert('Profil berhasil dihapus.');
  } catch (error) {
    console.error('Gagal menghapus profil:', error);
    showError(`Gagal menghapus profil: ${error.message}`);
  }
});

for (const input of Object.values(profileFields)) {
  input.addEventListener('input', updateLetterPreview);
  input.addEventListener('change', updateLetterPreview);
}

companyInput.addEventListener('input', updateLetterPreview);
positionInput.addEventListener('input', updateLetterPreview);
dateInput.addEventListener('change', updateLetterPreview);

letterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  updateLetterPreview();
});

const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');

dateInput.value = `${year}-${month}-${day}`;

printButtonSetup();
async function printButtonSetup() {
  const printButton = document.getElementById('print-button');
  const savePDFButton = document.getElementById('save-pdf-button');

  printButton.addEventListener('click', async () => {
    try {
      updateLetterPreview();

      const result = await window.documentAPI.print();

      if (result && !result.success && result.failureReason) {
        showError(`Gagal mencetak: ${result.failureReason}`);
      }
    } catch (error) {
      console.error('Gagal mencetak:', error);
      showError(`Terjadi kesalahan saat mencetak: ${error.message}`);
    }
  });

  savePDFButton.addEventListener('click', async () => {
    try {
      updateLetterPreview();

      const result = await window.documentAPI.savePDF();

      if (result?.success) {
        alert(`PDF berhasil disimpan di:\n${result.filePath}`);
      } else if (result?.error) {
        showError(`Gagal menyimpan PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Gagal menyimpan PDF:', error);
      showError(`Terjadi kesalahan saat menyimpan PDF: ${error.message}`);
    }
  });
}

async function initializeRenderer() {
  try {
    await loadProfiles();
  } catch (error) {
    console.error('Gagal memuat profil:', error);
    showError(`Gagal memuat profil: ${error.message}`);
  }

  updateLetterPreview();
}

initializeRenderer();
