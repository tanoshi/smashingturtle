window.onload=function(){
  var navtoggler = document.getElementById('n-toggler');
  var navwrapper = document.getElementById('navbar');

  function toggleNav() {
    navwrapper.classList.toggle('show'); // Add or remove class
  }

  if (navtoggler) {
    navtoggler.addEventListener('click', toggleNav, false);
  }
}
