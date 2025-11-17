# Terabyte Titans - Storm Outage Management System

A real-time storm outage management and routing optimization application built with React, TypeScript, and Azure Maps. This application helps utility crews efficiently manage and complete power outage restoration jobs by providing intelligent route optimization and interactive mapping capabilities.

## 🌟 Features

### Core Functionality
- **Interactive Map Visualization**: Azure Maps integration displaying outage locations, service territories, and optimized routes
- **Job Management**: Track and manage power outage restoration jobs with status tracking (Open, Assigned, In Progress, Done)
- **Intelligent Route Optimization**: Automatically calculates the most efficient route from the service center to the next job
- **Real-time Status Updates**: Mark jobs as complete and automatically recalculate routes for remaining outages
- **GeoJSON Import**: Load outage data from GeoJSON files or clipboard
- **Service Territory Display**: Visualize service coverage areas on the map
- **Performance Analytics**: View total distance traveled and time spent after completing all jobs

### User Interface
- **Split-panel Layout**: Job list sidebar with map view
- **Job Filtering**: Sort jobs by newest first or SLA deadline
- **Visual Status Indicators**: Color-coded markers (blue for incomplete, green for complete)
- **Route Visualization**: Red lines showing optimal routes, green lines showing completed routes
- **Completion Celebration**: Congratulatory popup with statistics when all jobs are finished

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **Azure Maps Control** - Interactive mapping
- **date-fns** - Date formatting and manipulation

### Backend
- **Express.js** - API server for route data persistence
- **Node.js** - Runtime environment

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **Concurrently** - Run multiple dev servers simultaneously

## 📋 Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn package manager
- Azure Maps subscription key or client ID

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd terabyte-titans-frontend-dev
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Azure Maps Authentication

Create a `.env` file in the project root with your Azure Maps credentials:

```env
VITE_AZURE_MAPS_SUBSCRIPTION_KEY=your_subscription_key_here
VITE_AZURE_MAPS_CLIENT_ID=your_client_id_here
```

**Note**: You need at least one of these authentication methods:
- Subscription Key (recommended for development)
- Client ID + Token URL (for production with managed identity)

To get Azure Maps credentials:
1. Go to [Azure Portal](https://portal.azure.com)
2. Create an Azure Maps account
3. Copy your subscription key or client ID from the Authentication section

### 4. Start the Development Server
```bash
npm run dev
```

This will start:
- Vite dev server on `http://localhost:5173`
- Express API server on `http://localhost:3001`

### 5. Open the Application
Navigate to `http://localhost:5173` in your browser.

## 📁 Project Structure

```
terabyte-titans-frontend-dev/
├── src/
│   ├── components/          # React components
│   │   ├── JobList.tsx      # Job list sidebar with filtering
│   │   ├── MapView.tsx      # Azure Maps integration
│   │   └── GeoJsonIngest.tsx # GeoJSON import functionality
│   ├── express/             # Backend API
│   │   ├── server.ts        # Express server setup
│   │   ├── routes/          # API routes
│   │   └── data/            # Stored route data
│   ├── map/                 # Map utilities
│   │   ├── routing.ts       # Route calculation logic
│   │   └── territory.ts     # Service territory rendering
│   ├── store/               # Zustand state management
│   │   └── useAppStore.ts   # Global app state
│   ├── utils/               # Utility functions
│   │   └── geo.ts           # GeoJSON parsing utilities
│   ├── types.ts             # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── public/
│   └── geoJson/             # Sample GeoJSON data files
│       ├── StormOutages.json
│       └── ServiceCenter.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🎯 Usage

### Managing Outage Jobs

1. **View Jobs**: The left sidebar displays all outage jobs with their addresses and statuses
2. **Filter Jobs**: Use "Newest" or "SLA Soon" buttons to sort the job list
3. **Select a Job**: Click on any job to center the map on that location
4. **Optimize Route**: Click "Optimize Route" to calculate the best next job to complete
5. **Complete a Job**: When a route is displayed, click "Complete routed job" to mark it as done
6. **Track Progress**: The map shows completed routes in green and the next optimal route in red

### Importing Custom Data

The application loads sample outage data from `/public/geoJson/StormOutages.json` by default. You can modify this file or add your own GeoJSON data following this format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-83.0458, 42.3314]
      },
      "properties": {
        "address": "123 Main St",
        "status": "Open",
        "createdAt": "2024-01-01T10:00:00Z",
        "slaAt": "2024-01-01T14:00:00Z"
      }
    }
  ]
}
```

## 🔧 Available Scripts

- `npm run dev` - Start development servers (Vite + Express)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🗺️ Key Features Explained

### Route Optimization Algorithm
The application uses Azure Maps Routing API to calculate actual driving routes and travel times. When you click "Optimize Route", it:
1. Gets your current location (initially the service center)
2. Calculates routes to all incomplete jobs
3. Selects the job with the shortest travel time
4. Displays the optimal route on the map

### State Management
Uses Zustand for lightweight, efficient state management:
- `jobs`: Array of all outage jobs
- `selectedJobId`: Currently selected job in the UI
- `routeTargetId`: Job that has an active route displayed
- `currentLocation`: Current position for route calculations
- `optimizeCounter`: Trigger for route recalculation

### Data Persistence
Completed routes are saved to the Express backend at `/api/save-route`, allowing for:
- Historical route analysis
- Performance metrics calculation
- Total distance and time tracking

## 🎨 Customization

### Styling
The application uses inline styles with CSS variables for theming. Key color variables:
- `--text-default`: Default text color
- `--panel-bg`: Panel background color
- `--panel-border`: Panel border color

### Map Configuration
Modify map settings in `MapView.tsx`:
- Initial center: `[-83.0458, 42.3314]` (Detroit area)
- Initial zoom: `11`
- Map style: `'road'`

## 🐛 Troubleshooting

### Map Not Loading
- Verify your Azure Maps credentials in `.env`
- Check browser console for authentication errors
- Ensure you have an active Azure Maps subscription

### Routes Not Calculating
- Confirm the Express server is running on port 3001
- Check that Azure Maps Routing API is enabled in your subscription
- Verify coordinates are valid (longitude, latitude format)

### Jobs Not Appearing
- Ensure `StormOutages.json` exists in `/public/geoJson/`
- Verify GeoJSON format is valid
- Check browser console for parsing errors

## 📝 License

This project is part of the Terabyte Titans team submission.

## 🤝 Contributing

This is a team project. For contributions, please coordinate with the Terabyte Titans team members.

## 📧 Support

For issues or questions, please contact the Terabyte Titans development team.

---

**Built with ⚡ by Terabyte Titans**
