$(document).ready(function(){
  var forms = {
    login: '#loginForm',
    settings: '#settingsForm',
    updateUserInfo: '#updateForm',
    addContact: '#contactForm',
    register: '#registerForm',
  }
  //initialize the firebase app
  var config = {
    apiKey: "AIzaSyCKNcULQZxFMYioXei32XNWQVoeutz4XDA",
    authDomain: "contact-book-new.firebaseapp.com",
    databaseURL: "https://contact-book-new.firebaseio.com",
    projectId: "contact-book-new",
    storageBucket: "contact-book-new.appspot.com",
    messagingSenderId: "473268388365"
  };
  firebase.initializeApp(config);

  //create firebase references
  var Auth = firebase.auth();
  var Storage = firebase.storage();
  var dbRef = firebase.database();
  var contactsRef = dbRef.ref('contacts')
  var profileImagesRef = Storage.ref().child('profile-images')
  var usersRef = dbRef.ref('users')
  var user = null;

  //Register
  $(forms.register).on('submit', function (e) {
    e.preventDefault();
    $('#registerModal').modal('hide');
    $('#messageModalLabel').html(span('<i class="fa fa-cog fa-spin"></i>', ['center', 'info']));
    $('#messageModal').modal('show');
    var data = {
      email: $('#registerEmail').val(), //get the email from Form
      firstName: $('#registerFirstName').val(), // get firstName
      lastName: $('#registerLastName').val(), // get lastName
    };
    
    var password = $('#registerPassword').val(); //get the pass from Form
    var cPassword = $('#registerConfirmPassword').val(); //get the confirmPass from Form
    var photo = $('#registerPhoto').get(0).files[0];
    var profileData = {
      displayName: data.firstName + ' ' + data.lastName,
      photoURL: null
    };
    if( data.email != '' && password != ''  && cPassword === password ){
      Auth.createUserWithEmailAndPassword(data.email, password)
        .then(function() { user = Auth.currentUser })
        .then(function() { photo ? saveImage(photo, user.uid, profileImagesRef) : null })
        .then(function(url) { profileData.photoURL = url; })
        .then(function(){ return user.updateProfile(profileData) })
        .then(function(){ saveUserInfo(data) })
        .then(function(){
          console.log("User Information Saved:", user.uid);
          $('#messageModalLabel').html(span('Success!', ['center', 'success']))
          
          $('#messageModal').modal('hide');
        })
        .catch(function(error){
          console.log("Error creating user:", error);
          $('#messageModalLabel').html(span('ERROR: '+error.code, ['danger']))
        });
    }  
  });

  //Login
  $(forms.login).on('submit', function (e) {
    e.preventDefault();
    $('#loginModal').modal('hide');
    $('#messageModalLabel').html(span('<i class="fa fa-cog fa-spin"></i>', ['center', 'info']));
    $('#messageModal').modal('show');

    var email = $('#loginEmail').val();
    var password = $('#loginPassword').val();
    if( email != '' && password != '' ){
      Auth.signInWithEmailAndPassword(email, password)
        .then(function(authData) {
          user = authData;
          $('#messageModalLabel').html(span('Success!', ['center', 'success']))
          $('#messageModal').modal('hide');
        })
        .catch(function(error) {
          console.log("Login Failed!", error);
          $('#messageModalLabel').html(span('ERROR: '+error.code, ['danger']))
        });
    }
  });

  $('#logout').on('click', function(e) {
    e.preventDefault();
    Auth.signOut();
  });

  //Login
  $(forms.updateUserInfo).on('submit', function (e) {
    e.preventDefault();
    var values = extractFormData(forms.updateUserInfo);
    user = Auth.currentUser;
    saveUserInfo(values).then(function(){
      console.log("User Information Saved:", user.uid);
    })
  });

  //save contact
  $(forms.addContact).on('submit', function( event ) {  
    event.preventDefault();
    if( user != null ){
      var formData = extractFormData(forms.addContact);
      if( formData.name !== '' || formData.email !== '' ){
        contactsRef.child(user.uid).push({
          name: formData.name,
          email: formData.email,
          location: {
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
          }
        });
        document.contactForm.reset();
      } else {
        alert('Please fill at-least name or email!');
      }
    }
  });

  Auth.onAuthStateChanged(function(userInfo) {
    if (userInfo) {
      user = userInfo;
      console.log(user)
      $('body').removeClass('auth-false').addClass('auth-true');
      usersRef.child(user.uid).once('value').then(function (snapshot) {
        var info = snapshot.val();
        var data = Object.assign({}, info, {
          photoURL: user.photoURL,
          displayName: user.displayName,
        });
        setUserInfoArea(data);
      });
      contactsRef.child(user.uid).on('child_added', onChildAdd);
    } else {
      // No user is signed in.
      $('body').removeClass('auth-true').addClass('auth-false');
      user && contactsRef.child(user.uid).off('child_added', onChildAdd);
      $('#contacts').html('');
      user = null;
    }
  });

  function saveUserInfo(data) {
    user = Auth.currentUser;
    return usersRef.child(user.uid).set(data)
  }
});
