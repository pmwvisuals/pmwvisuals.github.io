import { auth, db } from "./firebase.js";
import { requireAdmin } from "./admin-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CLOUDINARY_CLOUD_NAME = "dlmjetz3s";
const CLOUDINARY_UPLOAD_PRESET = "PMWVISUALS";

const loadingPanel = document.querySelector("#adminLoadingPanel");
const deniedPanel = document.querySelector("#adminDeniedPanel");
const dashboardPanel = document.querySelector("#adminDashboardPanel");
const adminEmail = document.querySelector("#adminEmail");
const logoutButton = document.querySelector("#adminLogoutButton");
const deniedLogoutButton = document.querySelector("#adminDeniedLogoutButton");
const form = document.querySelector("#addWallpaperForm");
const titleInput = document.querySelector("#wallpaperTitle");
const descriptionInput = document.querySelector("#wallpaperDescription");
const imageUrlInput = document.querySelector("#wallpaperImageUrl");
const publicIdInput = document.querySelector("#wallpaperPublicId");
const hashtagsInput = document.querySelector("#wallpaperHashtags");
const accessInput = document.querySelector("#wallpaperAccess");
const visibleInput = document.querySelector("#wallpaperVisible");
const typeList = document.querySelector("#wallpaperTypes");
const uploadButton = document.querySelector("#cloudinaryUploadButton");
const uploadStatus = document.querySelector("#uploadStatus");
const previewPanel = document.querySelector("#imagePreviewPanel");
const previewImage = document.querySelector("#imagePreview");
const imageMeta = document.querySelector("#imageMeta");
const publishButton = document.querySelector("#publishWallpaperButton");
const resetButton = document.querySelector("#resetWallpaperButton");
const formMessage = document.querySelector("#wallpaperFormMessage");

let cloudinaryWidget = null;
let uploadInProgress = false;
let imageDetails = {
  width: 0,
  height: 0,
  format: ""
};

function showPanel(panel) {
  [loadingPanel, deniedPanel, dashboardPanel].forEach((item) => {
    item.hidden = item !== panel;
  });
}

async function logout() {
  await signOut(auth);
  window.location.replace("admin-login.html");
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = type ? `admin-message ${type}` : "admin-message";
}

function setPublishState() {
  publishButton.disabled = uploadInProgress;
}

function getCategories() {
  return window.PMW_WALLPAPER_CATEGORIES || [
    "AMOLED",
    "Anime",
    "Celestial Samurai",
    "Dark Aesthetic",
    "Dark Fantasy",
    "Nature",
    "Romantic",
    "Space and Galaxy"
  ];
}

function renderTypeOptions() {
  typeList.innerHTML = getCategories().map((category, index) => `
    <label class="admin-check" for="wallpaperType${index}">
      <input id="wallpaperType${index}" type="checkbox" value="${category}">
      <span>${category}</span>
    </label>
  `).join("");
}

function getSelectedTypes() {
  return Array.from(typeList.querySelectorAll("input:checked")).map((input) => input.value);
}

function parseHashtags(value) {
  const seen = new Set();
  return String(value || "")
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, "").trim().toLowerCase())
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

function isCloudinaryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch (error) {
    return false;
  }
}

function updatePreview() {
  const imageUrl = imageUrlInput.value.trim();
  if (!imageUrl) {
    previewPanel.hidden = true;
    previewImage.removeAttribute("src");
    return;
  }

  previewImage.src = imageUrl;
  previewPanel.hidden = false;
  const details = [];
  if (imageDetails.width && imageDetails.height) details.push(`${imageDetails.width}x${imageDetails.height}`);
  if (imageDetails.format) details.push(imageDetails.format.toUpperCase());
  imageMeta.textContent = details.length
    ? details.join(" - ")
    : "Preview loaded from the image URL. Width, height, and format are saved when available from upload.";
}

function resetImageDetails() {
  imageDetails = {
    width: 0,
    height: 0,
    format: ""
  };
}

function fillFromCloudinaryUpload(info) {
  imageUrlInput.value = info.secure_url || "";
  publicIdInput.value = info.public_id || "";
  imageDetails = {
    width: Number(info.width) || 0,
    height: Number(info.height) || 0,
    format: String(info.format || "").toUpperCase()
  };
  updatePreview();
}

function initCloudinaryWidget() {
  if (!CLOUDINARY_UPLOAD_PRESET) {
    uploadButton.disabled = true;
    setMessage(uploadStatus, "Add your unsigned Cloudinary upload preset in js/admin.js to enable direct uploads.");
    return;
  }

  if (!window.cloudinary?.createUploadWidget) {
    uploadButton.disabled = true;
    setMessage(uploadStatus, "Cloudinary Upload Widget could not be loaded.", "error");
    return;
  }

  cloudinaryWidget = window.cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      sources: ["local"],
      multiple: false,
      resourceType: "image",
      clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
      maxFileSize: 12000000
    },
    (error, result) => {
      if (error) {
        uploadInProgress = false;
        setPublishState();
        setMessage(uploadStatus, error.message || "Cloudinary upload failed.", "error");
        return;
      }

      if (!result) return;

      if (result.event === "upload-added" || result.event === "queues-start") {
        uploadInProgress = true;
        setPublishState();
        setMessage(uploadStatus, "Uploading image to Cloudinary...");
      }

      if (result.event === "success") {
        fillFromCloudinaryUpload(result.info || {});
        setMessage(uploadStatus, "Upload complete. Image details were added to the form.", "success");
      }

      if (result.event === "queues-end" || result.event === "close") {
        uploadInProgress = false;
        setPublishState();
      }
    }
  );
}

function validateWallpaper() {
  const title = titleInput.value.trim();
  const imageUrl = imageUrlInput.value.trim();
  const types = getSelectedTypes();
  const access = accessInput.value;

  if (!title) return "Title is required.";
  if (!imageUrl) return "Image URL is required.";
  if (!isCloudinaryUrl(imageUrl)) return "Image URL must be a secure Cloudinary URL.";
  if (!types.length) return "Select at least one image type.";
  if (!["free", "premium"].includes(access)) return "Choose a valid access level.";
  if (uploadInProgress) return "Wait for the Cloudinary upload to finish before publishing.";
  return "";
}

function getWallpaperPayload() {
  return {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    imageUrl: imageUrlInput.value.trim(),
    cloudinaryPublicId: publicIdInput.value.trim(),
    types: getSelectedTypes(),
    hashtags: parseHashtags(hashtagsInput.value),
    access: accessInput.value,
    visible: visibleInput.value === "true",
    width: imageDetails.width,
    height: imageDetails.height,
    format: imageDetails.format,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

function resetForm() {
  form.reset();
  resetImageDetails();
  previewPanel.hidden = true;
  previewImage.removeAttribute("src");
  setMessage(uploadStatus, CLOUDINARY_UPLOAD_PRESET ? "" : "Add your unsigned Cloudinary upload preset in js/admin.js to enable direct uploads.");
  setMessage(formMessage, "");
  setPublishState();
}

function setSavingState(isSaving) {
  publishButton.disabled = isSaving || uploadInProgress;
  publishButton.textContent = isSaving ? "Saving..." : "Publish wallpaper";
}

requireAdmin({
  onAllowed(user) {
    adminEmail.textContent = user.email || user.uid;
    showPanel(dashboardPanel);
  },
  onDenied(user) {
    adminEmail.textContent = user.email || user.uid;
    showPanel(deniedPanel);
  }
});

logoutButton.addEventListener("click", logout);
deniedLogoutButton.addEventListener("click", logout);

renderTypeOptions();
initCloudinaryWidget();
setPublishState();

uploadButton.addEventListener("click", () => {
  if (!cloudinaryWidget) return;
  cloudinaryWidget.open();
});

imageUrlInput.addEventListener("input", () => {
  resetImageDetails();
  updatePreview();
});

resetButton.addEventListener("click", resetForm);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(formMessage, "");

  const validationMessage = validateWallpaper();
  if (validationMessage) {
    setMessage(formMessage, validationMessage, "error");
    return;
  }

  setSavingState(true);
  setMessage(formMessage, "Saving wallpaper...");

  try {
    const docRef = await addDoc(collection(db, "wallpapers"), getWallpaperPayload());
    resetForm();
    setMessage(formMessage, `Wallpaper saved with ID ${docRef.id}.`, "success");
  } catch (error) {
    console.error("Unable to save wallpaper.", error);
    setMessage(formMessage, error.message.replace("Firebase: ", ""), "error");
  } finally {
    setSavingState(false);
  }
});
