import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssignmentDetail, fetchAssignments, fetchMetrics, Metric } from '../api';
import { useUser } from '../context/UserContext';

const MetricCard = ({ metric }: { metric: Metric }) => (
  <Stat p={4} shadow="md" borderRadius="xl" bg="white">
    <StatLabel>{metric.description ?? metric.name}</StatLabel>
    <StatNumber>{metric.unit ? `${metric.value.toFixed(1)} ${metric.unit}` : metric.value.toFixed(0)}</StatNumber>
  </Stat>
);

const AssignmentCard = ({ assignment, onOpen }: { assignment: AssignmentDetail; onOpen: () => void }) => {
  const chipColor = useColorModeValue('teal', 'cyan');

  return (
    <Card borderRadius="xl" shadow="md">
      <CardBody>
        <Stack spacing={3}>
          <Flex justify="space-between" align="center">
            <Heading size="sm">{assignment.prompt.title}</Heading>
            <Badge colorScheme={chipColor}>{assignment.task.annotation_type}</Badge>
          </Flex>
          <Text noOfLines={3} color="gray.600">
            {assignment.prompt.body}
          </Text>
          <HStack spacing={3} fontSize="sm" color="gray.500">
            <Text>Category: {assignment.prompt.category ?? 'General'}</Text>
            {assignment.due_at && <Text>Due: {new Date(assignment.due_at).toLocaleDateString()}</Text>}
          </HStack>
          <Button onClick={onOpen} colorScheme="teal" variant="solid">
            Open Task
          </Button>
        </Stack>
      </CardBody>
    </Card>
  );
};

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentDetail[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [assignmentData, metricData] = await Promise.all([
          fetchAssignments(user.id),
          fetchMetrics(),
        ]);
        setAssignments(assignmentData);
        setMetrics(metricData);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  const openAssignment = (assignment: AssignmentDetail) => {
    navigate(`/tasks/${assignment.id}`, { state: { assignment } });
  };

  const pendingAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status !== 'completed'),
    [assignments],
  );

  return (
    <Box p={8} bg="gray.100" minH="100vh">
      <Stack spacing={8}>
        <Box>
          <Heading size="lg">Welcome back, {user?.name ?? 'Annotator'}!</Heading>
          <Text color="gray.600">Your assignments are prioritized based on your Holowellness expertise.</Text>
        </Box>

        {loading ? (
          <Flex justify="center" py={20}>
            <Spinner size="xl" color="teal.400" />
          </Flex>
        ) : (
          <Stack spacing={8}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {metrics.map((metric) => (
                <MetricCard key={metric.name} metric={metric} />
              ))}
            </SimpleGrid>

            <Divider />

            <Stack spacing={4}>
              <Heading size="md">Active assignments</Heading>
              {pendingAssignments.length === 0 ? (
                <Text color="gray.500">You are all caught up. New tasks will arrive soon.</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {pendingAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onOpen={() => openAssignment(assignment)}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default Dashboard;
