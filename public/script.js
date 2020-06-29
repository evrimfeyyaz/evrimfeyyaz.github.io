(function () {
  // From https://stackoverflow.com/a/42769683.
  let topBarHeight = 0;
  let mobileMenuToggle = null;
  let mobileTopBar = null;
  let mobileMenu = null;

  function convertRemToPixels(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }

  function hideMenu() {
    mobileMenu.style.display = "none";
  }

  function toggleMenu() {
    const isVisible = mobileMenu.style.display === "block";

    if (isVisible) {
      hideMenu();
    } else {
      mobileMenu.style.display = "block";
    }
  }

  let lastYOffset = 0;

  function toggleTopBar() {
    const currentYOffset = window.pageYOffset;

    if (currentYOffset <= (topBarHeight / 2) || currentYOffset <= lastYOffset) {
      mobileTopBar.style.top = "0";
    } else {
      hideMenu();
      mobileTopBar.style.top = `-${topBarHeight}px`;
    }

    lastYOffset = currentYOffset < "5rem" || currentYOffset;
  }

  document.addEventListener("DOMContentLoaded", () => {
    mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    mobileTopBar = document.getElementById("mobile-top-bar");
    mobileMenu = document.getElementById("mobile-menu");
    topBarHeight = convertRemToPixels(5);

    if (mobileMenuToggle != null) {
      mobileMenuToggle.onclick = toggleMenu;
    }

    window.addEventListener("scroll", toggleTopBar);
  });
})();
