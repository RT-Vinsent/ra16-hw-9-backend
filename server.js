const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body').default;
const cors = require('@koa/cors');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const passport = require('koa-passport');
const BearerStrategy = require('passport-http-bearer').Strategy;

const app = new Koa();
const router = new Router();

/**
 * Middleware для обработки CORS-запросов.
 * @function
 */
app.use(cors());

/**
 * Middleware для обработки данных в формате JSON.
 * @function
 */
app.use(koaBody({
  // text: true,
  // urlencoded: true,
  // multipart: true,
  json: true,
}));

let posts = [
  {
    "id": 1,
    "content": "Пост, относящийся к курсу React",
    "created": "2023-12-29T17:41:04.960316"
  },
  {
    "id": 2,
    "content": "Другой пост, относящийся к курсу по React",
    "created": "2023-12-29T17:41:04.960435"
  }
];
let nextId = 3;

const tokens = new Map();
const users = new Map();
const rounds = 10;
const news = [
  {
    "id": "1",
    "title": "Приключение",
    "image": "https://i.pravatar.cc/300?img=1",
    "content": "Присоединяйтесь к нам в увлекательное приключение по Зеленым горам!"
  },
  {
    "id": "2",
    "title": "Опыт сплава по реке",
    "image": "https://i.pravatar.cc/300?img=2",
    "content": "Приготовьтесь к захватывающему путешествию по бурным порогам реки."
  },
  {
    "id": "3",
    "title": "Восхождение на вершину",
    "image": "https://i.pravatar.cc/300?img=3",
    "content": "Станьте частью команды, покоряющей самые высокие горные пики."
  },
  {
    "id": "4",
    "title": "Ночь в пустыне",
    "image": "https://i.pravatar.cc/300?img=4",
    "content": "Исследуйте тайны пустыни и наслаждайтесь звездным небом вдали от городской суеты."
  }
];

users.set("admin", {
  id: uuid.v4(),
  login: "admin",
  name: "Admin",
  password: bcrypt.hashSync("admin", rounds),
  avatar: `https://i.pravatar.cc/300?img=12`, // ?id=${uuid.v4()}
});

// Настройка стратегии Passport
passport.use(new BearerStrategy((token, done) => {
  const user = tokens.get(token);
  if (!user) {
    return done(null, false);
  }
  return done(null, user);
}));

app.use(passport.initialize());

// Маршруты
router.post('/auth', async (ctx) => {
  console.log(ctx.request.body);
  try {
    const { login, password } = ctx.request.body;
    const user = users.get(login);
    if (!user) {
      ctx.status = 400;
      ctx.body = { message: "user not found" };
      return;
    }

    const result = await bcrypt.compare(password, user.password);
    if (!result) {
      ctx.status = 400;
      ctx.body = { message: "invalid password" };
      return;
    }

    const token = uuid.v4();
    tokens.set(token, user);
    ctx.body = { token };
  } catch (error) {
    console.error(error);
    ctx.status = 500;
    ctx.body = { message: "Server internal error" };
  }
});

const ensureAuthenticated = async (ctx, next) => {
  return passport.authenticate('bearer', { session: false }, (err, user) => {
    if (user) {
      ctx.state.user = user;
      return next();
    } else {
      ctx.status = 401;
      ctx.body = { message: "Unauthorized" };
    }
  })(ctx, next);
};

router.get('/private/me', ensureAuthenticated, async (ctx) => {
  ctx.body = {
    id: ctx.state.user.id,
    login: ctx.state.user.login,
    name: ctx.state.user.name,
    avatar: ctx.state.user.avatar,
  };
});

router.get('/private/news', ensureAuthenticated, async (ctx) => {
  ctx.body = news;
});

// маршрут для получения новости по id
router.get('/private/news/:id', ensureAuthenticated, async (ctx) => {
  try {
    const newsId = ctx.params.id;
    const item = news.find((o) => o.id === newsId);
    if (!item) {
      ctx.status = 404;
      ctx.body = { message: "not found" };
      return;
    }
    ctx.body = item;
  } catch (error) {
    console.error(error);
    ctx.status = 500;
    ctx.body = { message: "Server internal error" };
  }
});

router.get('/', (ctx) => {
  ctx.status = 200;
  ctx.body = { GET: 'ok', };
});

/* Список постов */
router.get('/posts', (ctx) => {
  ctx.body = JSON.stringify(posts);
});

/* Пост по id */ 
router.get('/posts/:id', (ctx) => {
  const postId = Number(ctx.params.id);
  const index = posts.findIndex((o) => o.id === postId);

  ctx.body = JSON.stringify({ post: posts[index] });
});

/* Создание нового поста */ 
router.post('/posts', (ctx) => {
  posts.push({ ...ctx.request.body, id: nextId++, created: Date.now() });
  ctx.status = 204;
});

/* Обновление поста */ 
router.put('/posts/:id', (ctx) => {
  const postId = Number(ctx.params.id);
  posts = posts.map((o) => {
    if (o.id === postId) {
      return {
        ...o,
        ...ctx.request.body,
        id: o.id,
      };
    }
    return o;
  });
  ctx.status = 204;
});

/* Удаление поста */ 
router.delete('/posts/:id', (ctx) => {
  const postId = Number(ctx.params.id);
  const index = posts.findIndex((o) => o.id === postId);
  if (index !== -1) {
    posts.splice(index, 1);
  }
  ctx.status = 204;
});

app
  .use(router.routes())
  .use(router.allowedMethods());

const port = process.env.PORT || 7070;

/**
 * Запуск сервера на указанном порту.
 * @function
 * @param {number} port - Порт, на котором будет запущен сервер.
 */
app.listen(port, () => console.log(`Сервер запущен на порту ${port}.`));
