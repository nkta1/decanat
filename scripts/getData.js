// Пользователь системы
var student = {
    token: "",
    name: "",
    surname: "",
    patronymic: ""
};

/**
 * Получение пользовательских данных из cookie
 * @return {object} Пользовательские данные
 */
var getDataFromCookie = function() {
    let data = {
        login: "",
        password: ""
    };

    let entryData = document.cookie.indexOf("entryData");
    let login;
    let password;

    if (entryData != -1) {
        login = document.cookie.substring(entryData + 10, document.cookie.indexOf("|p|"));
        password = document.cookie.substring(document.cookie.indexOf("|p|") + 3, document.cookie.indexOf("/p/"));
    }

    data.login = login;
    data.password = password;

    return data;
}

/**
 * Авторизация поьзователя в системе и получение токена
 * @param {function} Функция для промиса
 */
var authorizeUser = function(resolve, reject, personalData) {
    var userData;
    if (personalData != undefined)
        userData = {
            username: personalData.login,
            password: personalData.password,
            appToken: "XMowI7u40b"
        }
    else userData = {
    username: $("#username").val(),
    password: $("#password").val(),
    appToken: "XMowI7u40b"
  }

  // Авторизация
  $.ajax({
    type: "POST",
    url: "http://193.218.136.174:8080/cabinet/rest/auth/login",
    data: JSON.stringify(userData),
    success: function(data) {
      data = JSON.parse(data);
      student.token = data.usertoken; // Токен пользователя
      let user = {
          login: userData.username,
          password: userData.password
      };
      // Проверка на успешную авторизацию
      if (data.status == "success") resolve(user);
      else reject(data.msg); // При ошибке отправляем сведения о ней
    },
    contentType: "application/json"
  });
};

/**
 * Вход в систему
 * @return {object} Промис
 */
var login = function(data) {
  return new Promise((resolve, reject) => {
    authorizeUser(resolve, reject, data);
  });
};

/**
 * Попытка авторизации без ввода данных
 */
var tryToLogin = function() {
    let data = getDataFromCookie();  // Пользовательские данные
    if (data.login != undefined && data.password != undefined) {
      login(data).then((user) => {
              $(".errorMessage").css("display", "none"); // Скрываем сообщение об ошибке
              goToPersonalPage(); // Переход в личный кабинет
              saveDataInCookie(user.login, user.password);  // Сохранение пользовательских данных
              getAllData(); // Получение данных
              getDataFromCookie();
        })
        .catch(errorMessage => {
            $(".errorMessage").css("display", "block"); // Показываем сообщение об ошибке
            console.log(errorMessage);
        });
    }
}

tryToLogin();  // Попытка авторизации


$(".form-signin").submit(function(event) {
  event.preventDefault(); // Отмена перезагрузки страницы

  // Вход в систему
  login()
    .then((user) => {
      $(".errorMessage").css("display", "none"); // Скрываем сообщение об ошибке
      goToPersonalPage(); // Переход в личный кабинет
      saveDataInCookie(user.login, user.password);  // Сохранение пользовательских данных
      getAllData(); // Получение данных
      getDataFromCookie();
    })
    .catch(errorMessage => {
      $(".errorMessage").css("display", "block"); // Показываем сообщение об ошибке
      console.log(errorMessage);
    });
});

/**
 * Переход в личный кабинет
 */
var goToPersonalPage = function() {
    $(".auth-page").remove(); // Скрываем блок авторизации
    $(".personal-page").addClass("personal-page-active"); // Показываем личный кабинет
    $("body").css("backgroundColor", "#007bff");
};


/**
 * Получение всех данных от сервера после авторизации
 */
var getAllData = function() {
    getInitialData().then((data) => {
        collectInitialData(data);
        student.name = data.name;
        student.surname = data.surname;
        student.patronymic = data.patronymic;
    });
    getStudentsGroup(); // Получение списка группы
    getSemesters().then((studentSemesters) => getRecordBook(studentSemesters));  // Получение семестров
};


/**
 * Получение базовой информации о пользователе
 */
var getInitialData = function() {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "POST",
            url: "http://193.218.136.174:8080/cabinet/rest/student/get",
            data: JSON.stringify({
              text: "",
              userToken: student.token
            }),
            success: function(data) {
                data = JSON.parse(data);
                resolve(data.student);
            },
            contentType: "application/json"
        });
    });
};

/**
 * Получение списка одногруппников студента
 */
var getStudentsGroup = function() {
  $.ajax({
    type: "POST",
    url: "http://193.218.136.174:8080/cabinet/rest/student/classmates",
    data: JSON.stringify({
      text: "",
      userToken: student.token
    }),
    success: data => {
      classmates = JSON.parse(data);
      collectInitialData(classmates);
    },
    contentType: "application/json"
  });
};

/**
 * Получение пройденных семестров
 */
var getSemesters = function() {
    return new Promise((resolve, reject) => {
       $.ajax({
            type: 'POST',
            url: 'http://193.218.136.174:8080/cabinet/rest/student/semesters',
            data: JSON.stringify({ text: '', userToken: student.token }
            ),
            success: (data) => {
                studentSemesters = JSON.parse('{"obj":[' + data + ']}')
                        .obj[0].studentSemesters
                        .map(( { semesterName, groupname, idLGS } ) => (
                            { semesterName: semesterName, groupname: groupname, id: idLGS }
                            ));
                resolve(studentSemesters);
            },
            contentType: 'application/json'
        });
    });
};

/**
 * Сбор базовых данных и их вывод
 * @param {object} data Базовые данные
 */
var collectInitialData = function(data) {
  if (data.hasOwnProperty("students")) {
    data.students.map((classmate, index) => {
      $(".classmates-block").append(
        `<span>${index + 1}. ${classmate.surname} ${classmate.name}  ${
          classmate.patronymic
        }</span>`
      );
    });
  } else if (data.hasOwnProperty("birthday")) {
    let fullName = data.surname + " " + data.name + " " + data.patronymic; // Полное имя

    $("#full-name").append(fullName);
    $("#birthday").append(data.birthday);
    $("#email").append(data.email);
    $("#institute").append(data.institute);
    $("#groupname").append(data.groupname);
    $("#recordbook").append(data.recordbook);
    $("#groupLeader").append(data.groupLeader ? "Да":"Нет");

  } else if (data.hasOwnProperty("record")) {
      let ratings = data.record.ratings;
      console.log(ratings);
      console.log(data.record.semester);
        for (var i = 0; i < ratings.length; i++) {
            //$("#semester-number").append(i+1);
            console.log(ratings[i].subjectName);
        }
  }

};

/**
 * Получение зачетной книжки студента
 * @param {object} studentSemesters Список семестров студента
 */
var getRecordBook = function(studentSemesters) {
    for (var i = 0; i < studentSemesters.length; i++) {
        var semesterId = studentSemesters[i].id; // Getting ID
        var semesterName = studentSemesters[i].semesterName;
        getOneRecordBookRequest(semesterId, semesterName).then((recordBook) => collectInitialData(recordBook));
    }
};


/**
 * Получение оценок за один семестр
 * @param {number} semesterId ID семестра
 * @param {string} semesterName Название семестра
 * @return {object} Промис
 */
var getOneRecordBookRequest = function(semesterId, semesterName) {
    return new Promise(function(resolve, reject) {
       $.ajax({
        type: 'POST',
        url: 'http://193.218.136.174:8080/cabinet/rest/student/rating',
        data: JSON.stringify({semester: semesterId, userToken: student.token}),
        success: function(data) {
            rating = JSON.parse(data);
            var recordBook = {
                rating : rating,
                semesterName: semesterName
            };
            resolve(recordBook);  // Возвращаем оценки
        },
        contentType: 'application/json'
        });
    });
}

/**
 * Получение посещаемости группы
 * @param {string} Дата
 * @param {number} Неделя (четная - нечетная)
 */
var getAttendance = function(date, week) {
    $.ajax({
        type: 'POST',
        url: 'http://193.218.136.174:8080/cabinet/rest/student/attendance/day',
        data: JSON.stringify({week: week, date: date, userToken: student.token}),
        success: function(data) {
            attendance = JSON.parse(data);
            if (attendance.status == "error") {
                $("#attError").addClass("displayBlock");
                console.log("Неверные значения!");
            } else {
                $("#attError").removeClass("displayBlock");
                getUserAttendance(attendance);  // Вывод данных
            }
        },
        contentType: 'application/json'
    });

}

/**
 * Получение посещаемости конкретного студента
 * @param {object} attendance Посещаемость
 */
var getUserAttendance = function(attendance) {
    user = student;
    let subjects = [];
    attendance.subjects.forEach(function(subject, i) {
        subject.students.forEach(function(student, j) {
            if (student.patronymic == user.patronymic && student.family == user.surname && student.name == user.name) {
                let subjectAttendance = {
                    'attend': student.attend,
                    'subject': subject.subjectname
                };
                subjects[subjects.length] = subjectAttendance;
            }
        });
    });


    let table = "<table id='subjTable' class='table'><thead><tr><th>Название дисциплины</th><th>Посещение</th></tr></thead><tbody id='attendance-table'></tbody></table>";
    let area = $(".attendance-area");


    if ($("#subjTable") == undefined)
        $(area).append(table);  // Добавление таблицы
    else {
        $("#subjTable").remove();  // Удаление таблицы
        $(area).append(table);  // Добавление таблицы
    }

    subjects.forEach((subject) => {
        let attend = "+";
        if (subject.attend == -1)
            attend = "Н";
        $("#attendance-table").append("<tr><td>" + subject.subject + "</td><td>" + attend + "</td></tr>");
    });
}

/**
 * Выбор даты для вывода посещаемости
 */
$("#selectDate").click(() => {
    let date = $("#attendanceDate").val();  // Дата
    let week = $("#attendanceWeek").val();  // Неделя
    if (date == "" || week == "") {
        $("#attError").addClass("displayBlock");
        console.log("Пустые значения!");
    }
    else {
        $("#attError").removeClass("displayBlock");
        getAttendance(date, week);
    }
});

/**
 * Выход из системы
 */
$("#exit").click(() => {
    deleteCookie();
    location.reload();
});

/**
 * Сохранение логина и пароля в куки
 * @param {string} login Логин
 * @param {string} password Пароль
 */
var saveDataInCookie = function(login, password) {
    document.cookie = "entryData = " + login + "|p|" + password + "/p/";  // Сохранение входных данных
}

/**
 * Удаление cookie
 */
var deleteCookie = function() {
    document.cookie = "entryData = null; max-age = 0";  // Сохранение входных данных
}
