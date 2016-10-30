var particle = new Particle();
var token;
var device;
var eventStream;
var $app = $("#app");

var codeUrl = "https://raw.githubusercontent.com/carloop/app-simple-transmit/master/src";
var appFiles = [
  "app-simple-transmit.cpp",
  "project.properties",
];
var mainFile = "app-simple-transmit.cpp";

var appFileData = {};

var filePromises = appFiles.map(function (f) {
  return $.ajax(codeUrl + "/" + f)
  .then(function (data) {
    appFileData[f] = data;
  });
});

var templates = {
  loginForm: _.template($("#template-login-form").text()),
  selectDevice: _.template($("#template-select-device").text()),
  error: _.template($("#template-error").text()),
  mainUI: _.template($("#main-ui").text()),
};

function getToken() {
  token = localStorage.getItem('particle-token');
  return token;
}

function setToken(newToken) {
  token = newToken;
  localStorage.setItem('particle-token', token);
}

function getDevice() {
  device = localStorage.getItem('particle-device');
  return device;
}

function setDevice(newDevice) {
  device = newDevice;
  localStorage.setItem('particle-device', device);
}


function login() {
  if (!getToken()) {
    $app.html(templates.loginForm());
    $('#login-form').on('submit', function (event) {
      event.preventDefault();
      particleLogin()
    });
  } else {
    selectDeviceForm();
  }
}

function particleLogin() {
  var $username = $('#username');
  var $password = $('#password');
  var $submit = $('#login');
  var $errorMessage = $('#error-message');

  $username.prop('disabled', true);
  $password.prop('disabled', true);
  $submit.prop('disabled', true);

  var username = $username.val();
  var password = $password.val();

  particle.login({ username: username, password: password })
  .then(function (data) {
    setToken(data.body.access_token);
    selectDeviceForm();
  }, function (err) {
    var message = err.body && err.body.error_description || "User credentials are invalid";
    $errorMessage.html(message);

    $username.prop('disabled', false);
    $password.prop('disabled', false);
    $submit.prop('disabled', false);
  });
}

function selectDeviceForm(force) {
  if (force || !getDevice()) {
    particle.listDevices({ auth: token })
    .then(function (data) {
      var devices = data.body;
      $app.html(templates.selectDevice({ devices: devices}));
      $('[data-toggle="select"]').select2();
      
      $("#select-device").on("submit", function (event) {
        event.preventDefault();
        setDevice($("#device").val());
        mainUI();
      });
    })
    .catch(function (err) {
      showError();
    });
  } else {
    mainUI();
  }
}

function mainUI() {
  Promise.all(filePromises)
  .then(function () {
    $app.html(templates.mainUI());

    var $flashButton = $("#flash-button");
    var $idField = $("#message-id");
    var $dataField = $("#message-data");
    var $periodField = $("#message-period");
    var $code = $("#code");

    $flashButton.on('click', flashApp);
    $idField.on('change', updateCode);
    $dataField.on('change', updateCode);
    $periodField.on('change', updateCode);
    updateCode();

    function updateCode() {
      var template = appFileData[mainFile];

      var id = $idField.val();
      var data = $dataField.val();
      var len = data.length / 2;
      var period = $periodField.val();

      template = template
        .replace(/message.id = .*;/, "message.id = 0x" + id + ";")
        .replace(/message.len = .*;/, "message.len = " + len + ";")
        .replace(/transmitInterval = .*;/, "transmitInterval = " + period + ";");

      for (var i = 0; i < 8; i++) {
        var dataByte = data.slice(i * 2, (i + 1) * 2) || '00';
        template = template.replace(
          new RegExp("message.data\\[" + i + "\\] = .*;"),
          "message.data[" + i + "] = 0x" + dataByte + ";"
        );
      }

      $code.text(template);
    }
  });
}


function timeoutPromise(ms) {
  return new Promise(function (fulfill, reject) {
    setTimeout(function () {
      reject(new Error("Timeout"));
    }, ms);
  });
}

function flashApp() {
  clearConsole();
  log("Start flashing...");
  var files = {};

  for (var f in appFileData) {
    files[f] = new Blob([appFileData[f]], { type: "text/plain" });
  };

  var flashPromise = particle.flashDevice({
    deviceId: device,
    files: files,
    auth: token
  });

  // Add timeout to flash
  return Promise.race([flashPromise, timeoutPromise(10000)])
  .then(function (data) {
    var body = data.body;

    if (body.ok) {
      setTimeout(function () {
        log("Done flashing!");
        log("Your Carloop will now transmit the CAN message above");
      }, 2000);
    } else {
      error("Error during flash.");
      error(body.errors.join("\n"));
    }
  }, function (err) {
    if (err.message == "Timeout") {
      error("Timeout during flash. Is your device connected to the Internet (breathing cyan)?");
      return;
    }

    throw err;
  })
  .catch(function (err) {
    console.error(err);
    showError();
  });
}


function log(message) {
  printToConsole(message, 'info');
}

function error(message) {
  printToConsole(message, 'error');
}

function printToConsole(message, type, rawHtml) {
  var $el = $('<div class="' + type + '"/>');
  if (rawHtml) {
    $el.html(message);
  } else {
    $el.text(message);
  }
  $("#console").append($el);
}

function clearConsole() {
  $("#console").html('');
}

function showError() {
  $app.html(templates.error());
}

function logout() {
  setToken('');
  setDevice('');
  window.location.reload();
}


login();
