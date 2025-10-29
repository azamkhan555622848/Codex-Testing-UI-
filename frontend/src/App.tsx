import { Box, Flex } from '@chakra-ui/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TaskWorkspace from './components/TaskWorkspace';
import Login from './components/Login';
import { UserProvider, useUser } from './context/UserContext';

const AppRoutes = () => {
  const { user } = useUser();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tasks/:assignmentId" element={<TaskWorkspace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => (
  <UserProvider>
    <Flex minH="100vh" bg="gray.100">
      <Box flex="1">
        <AppRoutes />
      </Box>
    </Flex>
  </UserProvider>
);

export default App;
