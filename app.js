const axios = require('axios');
const redis = require('redis');

// connection to the service using our url, password 
client = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD
});
  
  
client.on("error", function (err) {
  console.error("Error " + err);
});



const help_text = `
Commands:

popular [option]
eg. 
 popular movie
 popular tv

`;
const BASEURL = 'https://api.themoviedb.org/3';

const buildurl = (path, queryObj) => {
    
    const serialize = obj => {
        let str = [];
        for (let p in obj){
            if (obj.hasOwnProperty(p)) {
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
        }
        return str.join("&");
    }
    const query = serialize(queryObj) ? `&${serialize(queryObj)}` : '';
    return `${BASEURL}/${path}/?api_key=${process.env.API_KEY}${query}`;
}

const parseResponse = response => (
  response.data.results.map(media => 
    `${media.title ? media.title : media.name} (${media.id})`).join('\n\n')
);

const axiosGet = async url => parseResponse(await axios.get(url));
const getPopularMovies = async () => axiosGet(buildurl('movie/popular'));
const getPopularTv = async () => axiosGet(buildurl('tv/popular'));
const searchMovies = async query => axiosGet(buildurl('search/movie', {query: query}));
const searTVs = async query => axiosGet(buildurl('search/tv', {query: query}));

const getMovieByID = async movieid => {
    const res = await axios.get(buildurl(`movie/${movieid}`).replace('/?', '?'));
    return res.data.original_title;
}

const getTvByID = async tvid => {
    const res = await axios.get(buildurl(`tv/${tvid}`).replace('/?', '?'));
    return res.data.original_name;
}

const parseIds = async ids => {
    return await Promise.all(ids.map(async id => {
      try{
          return await getMovieByID(id);
      }
      catch(e){
          return await getTvByID(id);
      }
    }));
}


const setFav = async favId => {
    return new Promise((resolve, reject) => {
        client.sadd('favs', favId, () => resolve());
    });
    
};
const getFav = async () => {
    return new Promise((resolve, reject) => {
        
        client.smembers('favs', async (err, replies) => {
            const r = await parseIds(replies);
            resolve(r.join(','));
            reject(err);
            
        });
    });
    
};

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
          return searchMovies(commands.splice(2));
      case 'search tv':
      case 'search tvs':
          return searTVs(commands.splice(2));
      case 'add fav':
          await setFav(commands[2]);
          return `${commands[2]} is added to fav`;
      case 'get fav':
          return getFav();
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
        
