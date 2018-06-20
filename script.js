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
  var dbRef = firebase.database();
  var contactsRef = dbRef.ref('contacts')
  var usersRef = dbRef.ref('users')
  var auth = null;

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
    var passwords = {
      password : $('#registerPassword').val(), //get the pass from Form
      cPassword : $('#registerConfirmPassword').val(), //get the confirmPass from Form
    }
    if( data.email != '' && passwords.password != ''  && passwords.cPassword != '' ){
      if( passwords.password == passwords.cPassword ){
        Auth.createUserWithEmailAndPassword(data.email, passwords.password)
          .then(function() {
            user = Auth.currentUser
            var imagesRef = firebase.storage().ref().child('profile-images');
            var file = $('#registerPhoto').get(0).files[0];
            var data = {
              displayName: data.firstName + ' ' + data.lastName,
              photoURL: null
            };
            if(file) {
              var task = saveImage(file, user.uid, imagesRef)
              task.on('state_changed', progress || console.log, error || console.error, function() {
                // Handle successful uploads on complete
                task.snapshot.ref.getDownloadURL().then(function(url) {
                  console.log('File available at', url);
                  data.photoURL = url;
                  return user.updateProfile(data)
                });
              });
            }
            return user.updateProfile(data)
          })
          .then(function(){
            auth = Auth.currentUser;
            saveUserInfo(data).then(function(){
              console.log("User Information Saved:", auth.uid);
            })
            $('#messageModalLabel').html(span('Success!', ['center', 'success']))
            
            $('#messageModal').modal('hide');
          })
          .catch(function(error){
            console.log("Error creating user:", error);
            $('#messageModalLabel').html(span('ERROR: '+error.code, ['danger']))
          });
      } else {
        //password and confirm password didn't match
        $('#messageModalLabel').html(span("ERROR: Passwords didn't match", ['danger']))
      }
    }  
  });

  //Login
  $(forms.login).on('submit', function (e) {
    e.preventDefault();
    $('#loginModal').modal('hide');
    $('#messageModalLabel').html(span('<i class="fa fa-cog fa-spin"></i>', ['center', 'info']));
    $('#messageModal').modal('show');

    if( $('#loginEmail').val() != '' && $('#loginPassword').val() != '' ){
      //login the user
      var data = {
        email: $('#loginEmail').val(),
        password: $('#loginPassword').val()
      };
      firebase.auth().signInWithEmailAndPassword(data.email, data.password)
        .then(function(authData) {
          auth = authData;
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
    firebase.auth().signOut()
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
    if( auth != null ){
      if( $('#name').val() != '' || $('#email').val() != '' ){
        contactsRef.child(auth.uid).push({
          name: $('#name').val(),
          email: $('#email').val(),
          location: {
            city: $('#city').val(),
            state: $('#state').val(),
            zip: $('#zip').val()
          }
        });
        document.contactForm.reset();
      } else {
        alert('Please fill at-least name or email!');
      }
    } else {
      //inform user to login
    }
  });

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      console.log(user)
      auth = user;
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
      auth && contactsRef.child(auth.uid).off('child_added', onChildAdd);
      $('#contacts').html('');
      auth = null;
    }
  });

  function saveUserInfo(data) {
    user = Auth.currentUser;
    return usersRef.child(user.uid).set(data)
  }
});
