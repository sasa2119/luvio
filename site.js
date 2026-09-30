const header = document.querySelector(".header");
const updateHeader = () => header.classList.toggle("scrolled", scrollY > 30);
addEventListener("scroll", updateHeader, { passive: true });
updateHeader();
const menu = document.querySelector("#mobile-menu");
const toggle = document.querySelector(".menu-toggle");
toggle.addEventListener("click", () => {
  if (menu.open) {
    menu.close();
    return;
  }
  menu.show();
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Close navigation");
});
menu.addEventListener("close", () => {
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
});
// This is a non-modal panel: let Tab leave naturally, then dismiss it.
menu.addEventListener('focusout', () => {
  requestAnimationFrame(() => {
    if (menu.open && !menu.contains(document.activeElement) && document.activeElement !== toggle)
      menu.close();
  });
});
menu
  .querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", () => menu.close()));
document.addEventListener("pointerdown", (e) => {
  if (menu.open && !menu.contains(e.target) && !toggle.contains(e.target))
    menu.close();
});
document.addEventListener("keydown", (e) => {
  if (menu.open && e.key === "Escape") {
    e.preventDefault();
    menu.close();
    toggle.focus();
  }
});
matchMedia("(min-width: 801px)").addEventListener("change", (e) => {
  if (e.matches && menu.open) menu.close();
});
document
  .querySelectorAll('input[name="_next"]')
  .forEach((input) => (input.value = location.origin + "/thank-you/"));

// Category filters keep URLs shareable, including the browser back button.
const filters = [...document.querySelectorAll("[data-filter]")];
if (filters.length) {
  const applyFilter = () => {
    const value = new URLSearchParams(location.search).get("category") || "all";
    const valid = filters.some((a) => a.dataset.filter === value)
      ? value
      : "all";
    let count = 0;
    document.querySelectorAll(".product-grid .product-card").forEach((card) => {
      card.hidden = valid !== "all" && card.dataset.category !== valid;
      if (!card.hidden) count++;
    });
    filters.forEach((a) => {
      if (a.dataset.filter === valid) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    document.querySelector("#tables-empty").hidden = valid !== "tables";
    document.querySelector("#piece-count").textContent =
      count + " " + (count === 1 ? "piece" : "pieces");
    document.querySelector("#collection-label").textContent =
      valid === "all"
        ? "All pieces"
        : filters.find((a) => a.dataset.filter === valid).textContent;
    document.dispatchEvent(new Event("collection:change"));
  };
  filters.forEach((a) =>
    a.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      history.pushState(null, "", a.href);
      applyFilter();
    }),
  );
  addEventListener("popstate", applyFilter);
  applyFilter();
}
const pieceNames = {
  cherry: "Cherry — Crystal T-Shirt",
  hummingbird: "Hummingbird — Crystal T-Shirt",
  headphones: "Headphones — Crystal Hoodie",
  leopard: "Leopard — Original Crystal Artwork",
  emerald: "Emerald — Crystal Watch Bracelet",
};
const piece = new URLSearchParams(location.search).get("piece");
const message = document.querySelector("#message");
if (message && pieceNames[piece])
  message.value =
    "Hello LUVIO, I would like to inquire about " + pieceNames[piece] + ".\n\n";
const typeField = document.querySelector("#creation-type");
const requestedType = new URLSearchParams(location.search).get("type");
if (typeField && [...typeField.options].some((o) => o.value === requestedType))
  typeField.value = requestedType;
// Product photographs use a native modal for focus trapping and Escape support.
const imageDialog = document.querySelector(".image-dialog");
if (imageDialog) {
  const mainImage = document.querySelector(".gallery-main img");
  const enlarged = imageDialog.querySelector("img");
  const stage = imageDialog.querySelector(".zoom-stage");
  document.querySelectorAll("[data-gallery-image]").forEach((btn) =>
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-gallery-image]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      for (const img of [mainImage, enlarged]) {
        img.src = "/images/" + btn.dataset.galleryImage + "-960.webp";
        img.srcset =
          "/images/" +
          btn.dataset.galleryImage +
          "-480.webp 480w, /images/" +
          btn.dataset.galleryImage +
          "-960.webp 960w";
      }
      mainImage.alt = btn.querySelector("img").alt;
      enlarged.alt = mainImage.alt;
    }),
  );
  document
    .querySelector(".gallery-main")
    .addEventListener("click", () => imageDialog.showModal());
  imageDialog
    .querySelector(".image-close")
    .addEventListener("click", () => imageDialog.close());
  stage.addEventListener("click", () => stage.classList.toggle("zoomed"));
  imageDialog.addEventListener("close", () => stage.classList.remove("zoomed"));
}
// Each attachment gets its own named file input for FormSubmit multipart support.
const upload = document.querySelector("#inspiration");
if (upload) {
  let files = [];
  const error = document.querySelector("#upload-error");
  const list = document.querySelector("#selected-files");
  const fields = document.querySelector("#attachment-fields");
  const maxBytes = 10_000_000;
  const validate = (items) =>
    items.some(
      (f) =>
        !/\.(jpe?g|png|webp)$/i.test(f.name) ||
        !["image/jpeg", "image/png", "image/webp"].includes(f.type),
    )
      ? "Please choose only JPG, JPEG, PNG, or WebP images."
      : items.reduce((sum, f) => sum + f.size, 0) > maxBytes
        ? "Your attachments exceed 10 MB. Please remove an image or choose smaller files."
        : "";
  const render = () => {
    list.replaceChildren();
    fields.replaceChildren();
    files.forEach((file, index) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = file.name;
      const size = document.createElement("small");
      size.textContent =
        file.size >= 1024 * 1024
          ? (file.size / 1024 / 1024).toFixed(2) + " MB"
          : Math.max(1, Math.round(file.size / 1024)) + " KB";
      name.append(size);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + file.name);
      remove.addEventListener("click", () => {
        files.splice(index, 1);
        error.textContent = "";
        render();
        upload.focus();
      });
      li.append(name, remove);
      list.append(li);
      const attachment = document.createElement("input");
      attachment.type = "file";
      attachment.name = index === 0 ? "attachment" : "attachment" + (index + 1);
      const transfer = new DataTransfer();
      transfer.items.add(file);
      attachment.files = transfer.files;
      fields.append(attachment);
    });
  };
  upload.addEventListener("change", () => {
    const candidates = [...files, ...upload.files];
    const invalid = validate(candidates);
    if (invalid) {
      error.textContent = invalid;
      upload.value = "";
      return;
    }
    error.textContent = "";
    files = candidates;
    render();
    upload.value = "";
  });
  document
    .querySelector("#custom-order-form")
    .addEventListener("submit", (e) => {
      const invalid = validate(files);
      if (invalid) {
        e.preventDefault();
        error.textContent = invalid;
        upload.focus();
      }
    });
}
// Native POST keeps FormSubmit's CAPTCHA. No simulated success state.
addEventListener("pageshow", () =>
  document.querySelectorAll("form button[type=submit]").forEach((b) => {
    b.disabled = false;
    if (b.dataset.label) b.innerHTML = b.dataset.label;
  }),
);
document.querySelectorAll("form").forEach((form) =>
  form.addEventListener("submit", (e) => {
    if (e.defaultPrevented) return;
    if (!navigator.onLine) {
      e.preventDefault();
      let error = form.querySelector(".network-error");
      if (!error) {
        error = document.createElement("p");
        error.className = "form-error network-error";
        error.setAttribute("role", "alert");
        form.append(error);
      }
      error.textContent =
        "You appear to be offline. Please reconnect and try again.";
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    if (btn) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Sending…";
    }
  }),
);
