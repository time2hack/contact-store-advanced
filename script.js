$(document).ready(function(){
  var mimes = {
    "image/gif": {
      "source": "iana",
      "compressible": false,
      "extensions": ["gif"]
    },
    "image/jpeg": {
      "source": "iana",
      "compressible": false,
      "extensions": ["jpeg","jpg","jpe"]
    },
    "image/png": {
      "source": "iana",
      "compressible": false,
      "extensions": ["png"]
    },
    "image/svg+xml": {
      "source": "iana",
      "compressible": true,
      "extensions": ["svg","svgz"]
    },
    "image/webp": {
      "source": "apache",
      "extensions": ["webp"]
    },
  };

  var saveImage = function(file, filename, ref) {
    if(!ref) ref = firebase.storage().ref();
    if(mimes[file.type].extensions[0]) {

      // Create the file metadata
      var metadata = {
        contentType: file.type
      };

      // Upload file and metadata to the object
      var uploadTask = ref.child(filename + '.' + mimes[file.type].extensions[0]).put(file, metadata);

      return uploadTask;
    }
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
  $('#registerForm').on('submit', function (e) {
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
        //create the user
        
        firebase.auth()
          .createUserWithEmailAndPassword(data.email, passwords.password)
          .then(function(user) {
            debugger
            var imagesRef = firebase.storage().ref().child('profile-images');
            var file = $('#registerPhoto').get(0).files[0];
            if(file) {
              var task = saveImage(file, user.uid, imagesRef)
              task.on('state_changed', function(snapshot){
                // Observe state change events such as progress, pause, and resume
                var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
                switch (snapshot.state) {
                  case firebase.storage.TaskState.PAUSED: // or 'paused'
                    console.log('Upload is paused');
                    break;
                  case firebase.storage.TaskState.RUNNING: // or 'running'
                    console.log('Upload is running');
                    break;
                }
              }, function(error) {
                // Handle unsuccessful uploads
                console.error(error)
              }, function() {
                // Handle successful uploads on complete
                task.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                  console.log('File available at', downloadURL);
                  return user.updateProfile({
                    displayName: data.firstName + ' ' + data.lastName,
                    photoURL: downloadURL
                  })
                });
              });
            } else {
              return user.updateProfile({
                displayName: data.firstName + ' ' + data.lastName
              })
            }
          })
          .then(function(user){
            //now user is needed to be logged in to save data
            auth = user;
            //now saving the profile data
            usersRef.child(user.uid).set(data)
              .then(function(){
                console.log("User Information Saved:", user.uid);
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
  $('#loginForm').on('submit', function (e) {
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

  //save contact
  $('#contactForm').on('submit', function( event ) {  
    event.preventDefault();
    if( auth != null ){
      if( $('#name').val() != '' || $('#email').val() != '' ){
        contactsRef.child(auth.uid)
          .push({
            name: $('#name').val(),
            email: $('#email').val(),
            location: {
              city: $('#city').val(),
              state: $('#state').val(),
              zip: $('#zip').val()
            }
          })
          document.contactForm.reset();
      } else {
        alert('Please fill at-lease name or email!');
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
      usersRef.child(user.uid).once('value').then(function (data) {
        var info = data.val();
        if(user.photoURL) {
          $('.user-info img').show();
          $('.user-info img').attr('src', user.photoURL);
          $('.user-info .user-name').hide();
        } else if(user.displayName) {
          $('.user-info img').hide();
          $('.user-info').append('<span class="user-name">'+user.displayName+'</span>');
        } else if(info.firstName) {
          $('.user-info img').hide();
          $('.user-info').append('<span class="user-name">'+info.firstName+'</span>');
        }
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
});

function onChildAdd (snap) {
  $('#contacts').append(contactHtmlFromObject(snap.key, snap.val()));
}
 
//prepare contact object's HTML
function contactHtmlFromObject(key, contact){
  return '<div class="card contact" style="width: 18rem;" id="'+key+'">'
    + '<div class="card-body">'
      + '<h5 class="card-title">'+contact.name+'</h5>'
      + '<h6 class="card-subtitle mb-2 text-muted">'+contact.email+'</h6>'
      + '<p class="card-text" title="' + contact.location.zip+'">'
        + contact.location.city + ', '
        + contact.location.state
      + '</p>'
    + '</div>'
  + '</div>';
}

function span(textStr, textClasses) {
  var classNames = textClasses.map(c => 'text-'+c).join(' ');
  return '<span class="'+classNames+'">'+ textStr + '</span>';
}