# NotFacebook - Social Media Platform

A full-stack social media application built with .NET Core backend and React frontend.

## 🚀 Features

- User authentication and profile management
- Post creation with images
- Like and comment on posts
- Direct messaging between users
- Follow/unfollow system
- Real-time updates

## 🛠️ Tech Stack

### Backend
- .NET Core 8.0
- Entity Framework Core
- SQL Server
- ASP.NET Core Web API

### Frontend
- React 18
- Vite
- CSS3
- Axios for API calls

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0) or later
- [Node.js](https://nodejs.org/) (v18 or later)
- [SQL Server](https://www.microsoft.com/sql-server) (LocalDB, Express, or Full Edition)
- A code editor (Visual Studio, VS Code, or Rider)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/ylmztalhaklc/web-blog.git
cd web-blog
```

### 2. Backend Setup

#### Navigate to Backend Directory
```bash
cd Backend
```

#### Update Connection String
Open `NotFacebook.Api/appsettings.json` and update the connection string:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=NotFacebookDb;Trusted_Connection=true;TrustServerCertificate=true;"
  }
}
```

#### Restore Dependencies
```bash
dotnet restore
```

#### Apply Database Migrations
```bash
cd NotFacebook.Api
dotnet ef database update
```

#### Run the Backend
```bash
dotnet run
```

The API will start at `https://localhost:7000` (or the port specified in `launchSettings.json`)

### 3. Frontend Setup

#### Navigate to Frontend Directory (from root)
```bash
cd Frontend
```

#### Install Dependencies
```bash
npm install
```

#### Update API Base URL (if needed)
Open `src/api/api.js` and verify the base URL matches your backend:
```javascript
const API_BASE_URL = 'https://localhost:7000';
```

#### Run the Frontend
```bash
npm run dev
```

The application will start at `http://localhost:5173`

## 🎯 Usage

1. **Register**: Create a new account with username, email, and password
2. **Login**: Sign in with your credentials
3. **Create Posts**: Share your thoughts with images
4. **Interact**: Like, comment, and engage with other users' posts
5. **Follow**: Follow other users to see their posts in your feed
6. **Message**: Send direct messages to other users
7. **Profile**: View and edit your profile information

## 📁 Project Structure

```
notFacebook/
├── Backend/
│   ├── NotFacebook.Api/          # Web API project
│   │   ├── Controllers/          # API endpoints
│   │   ├── Program.cs            # Application entry point
│   │   └── appsettings.json      # Configuration
│   ├── NotFacebook.Core/         # Domain entities
│   │   └── Entities/             # Data models
│   └── NotFacebook.Infrastructure/
│       ├── Data/                 # DbContext
│       └── Migrations/           # Database migrations
└── Frontend/
    ├── src/
    │   ├── api/                  # API service
    │   ├── components/           # Reusable components
    │   ├── pages/                # Page components
    │   └── styles/               # CSS files
    ├── public/                   # Static assets
    └── package.json              # NPM dependencies
```

## 🔑 API Endpoints

### Authentication
- `POST /api/account/register` - Register new user
- `POST /api/account/login` - User login
- `GET /api/account/profile` - Get user profile

### Posts
- `GET /api/post` - Get all posts
- `POST /api/post` - Create new post
- `PUT /api/post/{id}` - Update post
- `DELETE /api/post/{id}` - Delete post
- `POST /api/post/{id}/like` - Like/unlike post
- `POST /api/post/{id}/comment` - Add comment

### Follow System
- `POST /api/follow/{userId}` - Follow/unfollow user
- `GET /api/follow/followers` - Get followers
- `GET /api/follow/following` - Get following

### Messages
- `GET /api/message` - Get user messages
- `POST /api/message` - Send message
- `PUT /api/message/{id}` - Edit message
- `DELETE /api/message/{id}` - Delete message

## 🗄️ Database Schema

Key entities:
- **User**: User accounts and profiles
- **Post**: User posts with content and images
- **PostLike**: Post likes tracking
- **PostComment**: Comments on posts
- **Follow**: User follow relationships
- **Message**: Direct messages between users

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure SQL Server is running
- Verify connection string in `appsettings.json`
- Check if database exists: `dotnet ef database update`

### CORS Errors
- Verify backend CORS policy includes frontend URL
- Check API base URL in frontend configuration

### Port Conflicts
- Backend: Change port in `launchSettings.json`
- Frontend: Change port in `vite.config.js`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**ylmztalhaklc**
- GitHub: [@ylmztalhaklc](https://github.com/ylmztalhaklc)

## 🙏 Acknowledgments

- Built with .NET Core and React
- Inspired by modern social media platforms
- Icons from various free sources

---

Made with ❤️ by ylmztalhaklc
