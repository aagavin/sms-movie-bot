const axios = require('axios');


const help_text = `
Commands:

popular [option]
eg. 
 popular movie
 popular tv

`;
const BASEURL = 'https://api.themoviedb.org/3';
const buildurl = path => {
    return `${BASEURL}/${path}/?api_key=${process.env.API_KEY}`;
}

const getPopular = async url => {
    const response = await axios.get(`${buildurl(url)}`);
    return response.data.results.map(media => {
        return `${media.title ? media.title : media.name} (${media.id})`;
    }).join('\n\n');
};

const getPopularMovies = async () => getPopular('movie/popular');

const getPopularTv = async () => getPopular('tv/popular');

const searchMovies = async query => {
    
}

const parseBody = async body => {
  const commands = body.toLowerCase().split(' ');
  switch(`${commands[0]} ${commands[1]}`){
      case 'popular movie':
      case 'popular movies':
          return getPopularMovies();
      case 'popular tv':
          return getPopularTv();
      case 'search movie':
      case 'search movies':
          return searchMovies(commands[2]);
      case '--help':
          return help_text;
      default:
          return 'Not a valid request, text "--help" without quotes for support';
  }  
};

exports.handler = async function(context, event, callback) {
	let twiml = new Twilio.twiml.MessagingResponse();
	twiml.message(await parseBody(event.Body));
	callback(null, twiml);
};
