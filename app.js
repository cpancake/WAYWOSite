var http	= require('http'),
	// WAYWO discussion topic: cheese pizza is the superior form of pizza
	cp		= require('child_process'),
	path	= require('path'),
	glob	= require('glob'),
	fs 		= require('fs');

var settings = {
	index: 'js rb c cpp cs php html'
};

http.createServer(function(req, res) {	
	function error(code, resp)
	{
		res.writeHead(code, {'Content-Type': 'text/html'});
		res.end(resp.toString());
		return;
	}
	console.log('[request] ' + req.url);
	req.url = sanitizePath(req.url);
	if(req.url == '/') // find the index
		return glob('www/*.*', function(err, files) {
			if(err) 
				return error(500, err);
			if(files.length == 0)
				return error(404, '/ could not be found');
			var exts = settings.index.split(' ');
			var index = (function() {
				for(var i=0;i<exts.length;i++)
					for(var j=0;j<files.length;j++)
						if(files[j].length >= exts[i].length && files[j].substr(-exts[i].length) == exts[i])
							return files[j];
			})();
			if(!index)
				return error(404, '/ could not be found');
			fs.readFile(index, {encoding: 'utf8'} , function(err, data) {
				if(err)
					return error(500, err);
				executeData(path.basename(index), data, function(err, out) {
					if(err)
						return error(500, err);
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.end(out);
				});
			});
		});
	else
	{
		if(req.url.substr(0, 1) == '/') req.url = req.url.substr(1);
		fs.readFile(path.join(__dirname, 'www', req.url), {encoding: 'utf8'}, function(err, data) {
			if(err)
				return error(500, err);
			executeData(path.basename(req.url), data, function(err, out) {
				if(err)
					return error(500, err);
				res.writeHead(200, {'Content-Type': 'text/html'});
				res.end(out);
			});
		});
	}
}).listen(process.env.PORT || 80);

function executeData(name, data, callback)
{
	var reg = /#!\s?(.+?)($|\n|\r)/.exec(data);
	if(!reg)
		callback(null, data);
	else
	{
		var ex = reg[1];
		var args = [path.join(__dirname, 'www', name)];
		if(ex.indexOf(' ') != -1)
			args = ex.split(' ').slice(1).concat(args);
		var child = cp.spawn(ex.split(' ')[0], args);
		console.log('[executed] ' + ex.split(' ')[0] + ' ' + args.join(' '));
		var data = '';
		var error = '';
		child.stdout.on('data', function(d) { data += d; });
		child.stderr.on('data', function(d) { error += d; });
		child.on('close', function(code) { 
			console.log('[exited] with code ' + code); 
			if(error)
				return callback(error, null);
			callback(false, data);
		});
	}
}

// 1000% safe
function sanitizePath(path)
{
	if(path.indexOf('..') != -1 || path.substr(1) == '/')
		return '/';
	return path;
}

console.log('server up at port ' + process.env.PORT);