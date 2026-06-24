package com.ergdashboard.android.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ergdashboard.android.ui.auth.AuthUiState
import com.ergdashboard.android.ui.auth.AuthViewModel
import com.ergdashboard.android.ui.auth.LoginScreen
import com.ergdashboard.android.ui.dashboard.DashboardScreen
import com.ergdashboard.android.ui.home.HomeScreen
import com.ergdashboard.android.ui.sessions.SessionsScreen
import com.ergdashboard.android.ui.vitals.VitalsScreen

private sealed class AppScreen(val route: String, val label: String, val icon: ImageVector) {
    object Home : AppScreen("home", "Home", Icons.Default.Home)
    object Sessions : AppScreen("sessions", "Sessions", Icons.Default.List)
    object Pmc : AppScreen("pmc", "PMC", Icons.Default.BarChart)
    object Vitals : AppScreen("vitals", "Vitals", Icons.Default.Favorite)
}

private val bottomNavItems = listOf(AppScreen.Home, AppScreen.Sessions, AppScreen.Pmc, AppScreen.Vitals)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavGraph() {
    val authViewModel: AuthViewModel = viewModel(factory = AuthViewModel.Factory)
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()

    when (authState) {
        is AuthUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        is AuthUiState.Unauthenticated -> {
            LoginScreen(viewModel = authViewModel)
        }
        is AuthUiState.Authenticated -> {
            val navController = rememberNavController()
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = backStackEntry?.destination?.route

            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("ERG") },
                        actions = {
                            IconButton(onClick = { authViewModel.signOut() }) {
                                Icon(Icons.Default.Logout, contentDescription = "Sign out")
                            }
                        },
                    )
                },
                bottomBar = {
                    NavigationBar {
                        bottomNavItems.forEach { screen ->
                            NavigationBarItem(
                                selected = currentRoute == screen.route,
                                onClick = {
                                    navController.navigate(screen.route) {
                                        popUpTo(navController.graph.startDestinationId) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = { Icon(screen.icon, contentDescription = screen.label) },
                                label = { Text(screen.label) },
                            )
                        }
                    }
                },
            ) { innerPadding ->
                NavHost(
                    navController = navController,
                    startDestination = AppScreen.Home.route,
                    modifier = Modifier.padding(innerPadding),
                ) {
                    composable(AppScreen.Home.route) { HomeScreen() }
                    composable(AppScreen.Sessions.route) { SessionsScreen() }
                    composable(AppScreen.Pmc.route) { DashboardScreen() }
                    composable(AppScreen.Vitals.route) { VitalsScreen() }
                }
            }
        }
    }
}
