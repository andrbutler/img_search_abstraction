var express = require('express');
var app = express();
var GoogleSearch = require('google-search');
var search = new GoogleSearch({
	key : process.env.GOOGLE_SEARCH_API,
	cx : process.env.GOOGLE_SEARCH_ID
});
var mongodb = require('mongodb').MongoClient;
var dbUrl = process.env.MONGOLAB_FCCBACKEND_URI; 
//'mongodb://localhost:27017/fcc_backend'

app.set('port', (process.env.PORT || 8080));

app.use(express.static('public'));

app.get('/', function(req, resp){
	resp.writeHead(200, {'Content-type': 'text/html'});
	resp.on('error', function(error){
		console.log(error);
	});
	resp.sendfile('index.html');
});

app.get('/search/:term', function(req, resp, next){
	var time = new Date();
	var minute = time.getMinutes().toString();
	if(minute.length == 1){
		minute = '0' + minute;
	}
	var second = time.getSeconds().toString();
	if(second.length == 1){
		second = '0' + second;
	}
	var timeStamp = (time.getMonth() + 1) + '-' + time.getDate() + '-' +
	time.getFullYear() + ' ' + time.getHours() + ':' + minute +
	':' + second;
	var searchLog ={
		'when' : timeStamp,
		'sTerm' : req.params.term
	};
	console.log('when',searchLog.when, '\n term', searchLog.sTerm)
	mongodb.connect(dbUrl, function(err, db){
		if (err){
			console.log('unable to connect to database server. error:', err);
		}else{
			db.collection('img_search').update(
				{'name':'history'}, 
				{'$push':{'log': searchLog}},
				function(err){
				if(err){
				console.log(err);
				}else{
					db.close();
					next();
				}
			});
		}
	});	
	
});

app.get('/search/:term', function(req, resp){
	var offset = parseInt(req.query.offset) || 0;
	var val = req.params.term;
	search.build({
		q: val,
		searchType: 'image',
		start: offset+1,
		num: 10
	}, function(err, data){
		if(err){
			console.log(err);
		}else{
			console.log(data);
			resp.writeHead(200, {'Content-type': 'application/json'});
			var arr = data.items;
			var newArr =[];
			console.log(arr);
			for(var i=0;i<arr.length;i++){
				newArr.push({link: arr[i].link, snippet: arr[i].snippet, 
				context: arr[i].image.contextLink, thumbnail: arr[i].image.thumbnailLink})
			}
			resp.end(JSON.stringify(newArr));
		}
	});
});

app.get('/history', function(req, resp){
	resp.on('error', function(error){
		console.log(error);
	});
	mongodb.connect(dbUrl, function(err, db){
		if (err){
			console.log('unable to connect to database server. error:', err);
		}else{
			db.collection('img_search').find().toArray(function(err, docs){
				if(err){
					console.log(err);
				}else{
					resp.writeHead(200, {'Content-type': 'application/json'});
					console.log(docs[0].log);
					var hist = docs[0].log;
					if(hist.length > 9){
						hist = hist.slice(-10);
					}
					resp.end(JSON.stringify(hist));
				}
			});
		}
		db.close();
	});
});

app.listen(app.get('port'), function(){
	console.log('app running on port: ' + app.get('port'))
});