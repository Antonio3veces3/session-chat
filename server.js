var mysql= require("mysql");
var express= require("express");
var session= require("express-session");
var bodyParser= require("body-parser");
var path= require("path");
//var http= require('http').Server(app);
var http= require('http');
var app= express();
var server= http.createServer(app);
var io= require('socket.io')(server);

var connection= mysql.createConnection({ //crear conexion con mysql
    host: 'localhost',
    database: 'nodelogin',
    user: 'root',
    password: ''
});

connection.connect((err)=>{
    if(err)
    throw err;
    else
    console.log('Conexion exitosa');
})


app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

io.on('connection',(socket)=>{
    console.log('se ha conectado un usuario');

    var username;
    socket.on('recibirUser',(data)=>{
        username=data;
    });

    socket.on('msjNuevo', (data)=>{ //crea el nuevo mensaje
        socket.broadcast.emit('mensaje',{
            usuario: username,
            mensaje: data 
        });
        
        connection.query('INSERT INTO mensajes (txt, origen_user, fecha) VALUES (?,?,CURDATE())',[mensaje, username]);
        
        socket.emit('mensaje',{
           usuario: username,
           mensaje: data 
        })
    });
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/',function(resquest,response){
    response.sendFile(path.join(__dirname+'/vistas/index.html'));
});

app.get('/registro', function(request,response){
    response.sendFile(path.join(__dirname+'/vistas/registro.html'));
})

app.post('/auth', function(request,response){
    var username= request.body.username;
    var password= request.body.password;

    if(username && password){
        connection.query('SELECT * FROM accounts WHERE username= ? AND password= ?',[username,password],function(error,result,fields){
            if(result.length>0){
                request.session.loggedin= true;
                request.session.username= username;
                response.redirect('/chat');
            }else{
                response.send('Usuario y password incorrectos');
            }
            response.end();
        });
    }else{
        response.send('Ingresa user y password');
        response.end();
    }
});



app.get('/logout', function(request,response){
    request.session.destroy();
    response.redirect('/');
});

app.post('/registrar', (request,response)=>{
    var username= request.body.username;
    var password= request.body.password;
    var email= request.body.email;

    if(username && password && email){
        //Validar si ya existe
        connection.query('SELECT * FROM accounts WHERE username= ? OR email= ?',[username,email], function(error,result,fields){
            if(result.length>0){
                response.send('¡ERROR! Usuario o Email ya EXISTENTES');
            }else{
                connection.query('INSERT INTO accounts (username, password, email) VALUES (?,?,?)',[username,password,email], function(error, result,fields){
                    if(!error){
                        response.send('Te has registrado CORRECTAMENTE :)');
                    }else{
                        response.send('Ha ocurrido un error :c');
                    }
                })
            }
        });
    }else{
        response.send('Ingresa todos los campos');
    }
}); 

app.get('/chat',function(request,response){
    if(request.session.loggedin){
        response.sendFile(path.join(__dirname+'/vistas/chat.html'));
    }else{
        response.send('Iniciar sesion de nuevo, gracias');
    }
});

app.listen(3001, function(){
    console.log("Escuchando en el puerto 3001");
});

