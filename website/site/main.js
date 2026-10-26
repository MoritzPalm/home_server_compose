(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The name is set in a variable font. After the load animation settles, the
  // cursor's horizontal position nudges its width a little. Pointer devices only.
  const name = document.querySelector(".name");
  if (name && !reduceMotion && matchMedia("(pointer: fine)").matches) {
    let armed = false;
    let raf = 0;
    let current = 112;
    let target = 112;

    const arm = () => { armed = true; };
    name.addEventListener("animationend", arm, { once: true });
    // Fallback if the animation never fires (fonts late, animation disabled).
    setTimeout(arm, 2000);

    const tick = () => {
      current += (target - current) * 0.12;
      name.style.setProperty("--wdth", current.toFixed(2));
      raf = Math.abs(target - current) > 0.05 ? requestAnimationFrame(tick) : 0;
    };

    addEventListener("pointermove", (e) => {
      if (!armed) return;
      target = 105 + (e.clientX / innerWidth) * 12;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }

  // Copy the email address; fall back to selecting it where the clipboard is refused.
  const button = document.getElementById("copy-mail");
  const mail = document.getElementById("mail");
  if (button && mail) {
    const label = button.querySelector("span");
    const idle = label.textContent;
    let timer = 0;

    const show = (state, text) => {
      button.dataset.state = state;
      label.textContent = text;
      clearTimeout(timer);
      timer = setTimeout(() => {
        delete button.dataset.state;
        label.textContent = idle;
      }, 1800);
    };

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        show("copied", "Copied");
      } catch {
        const range = document.createRange();
        range.selectNodeContents(mail);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        show("select", "Selected");
      }
    });
  }
})();
