import {
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Stack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUser } from '../context/UserContext';

const Login = () => {
  const { login } = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'reviewer' | 'annotator'>('annotator');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    login({ id: Date.now(), name, email, role });
    navigate('/dashboard');
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minH="100vh" bg="gray.50">
      <Card w="sm" shadow="xl" borderRadius="xl">
        <CardBody as="form" onSubmit={handleSubmit}>
          <Stack spacing={6}>
            <Heading size="md" textAlign="center">
              Holowellness Annotation Console
            </Heading>
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Clinician Name" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="clinician@example.com"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Role</FormLabel>
              <Select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
                <option value="annotator">Annotator</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </Select>
            </FormControl>
            <Button type="submit" colorScheme="teal" isDisabled={!name || !email}>
              Enter Workspace
            </Button>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Login;
