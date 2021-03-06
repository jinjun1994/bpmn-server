import debug = require('debug');
import express = require('express');
import path = require('path');
var busboy = require('connect-busboy'); //middleware for form/file upload
var bodyParser = require('body-parser')

import routes from './routes/index';
import model from './routes/model';
import docs from './routes/docs';
import api from './routes/api';





const app = express();

// support parsing of application/json type post data

app.use(bodyParser.json({ limit: '10mb' }));

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(busboy());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/model', model);
app.use('/docs', docs);
app.use('/api', api);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err['status'] = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        res.status(err['status'] || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', process.env.PORT || 3000);

const server = app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + server.address().port);
    debug('Express server listening on port ' + server.address().port);
});


