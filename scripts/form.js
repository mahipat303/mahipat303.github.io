const scriptURL =
  "https://script.google.com/macros/s/AKfycbwA3RQqB7Q7esNXJi4YJuM_dh59QvXDWaMuA9izZkRBsbiVRXOqsEh7Xaa_0KB4JT3M/exec";
const form = document.forms["submit-to-google-sheet"];
const msg = document.getElementById("msg");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  fetch(scriptURL, { method: "POST", body: new FormData(form) })
    .then((response) => {
      msg.innerHTML = "Message sent successfully";
      setTimeout(function () {
        msg.innerHTML = "";
      }, 5000);
      form.reset();
    })
    .catch((error) => console.error("Error!", error.message));
});
