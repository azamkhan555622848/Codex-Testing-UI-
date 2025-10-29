import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AssignmentDetail, fetchAssignments, submitAnnotation } from '../api';
import { useUser } from '../context/UserContext';
import { AnnotationType } from '../types';

const getAnnotationDefaults = (assignment: AssignmentDetail) => {
  if (assignment.task.annotation_type === 'rubric') {
    return Object.fromEntries(
      Object.entries(assignment.task.rubric_config ?? {}).map(([dimension, maxScore]) => [
        dimension,
        { score: Math.ceil((maxScore as number) / 2), maxScore },
      ]),
    );
  }
  return {};
};

const TaskWorkspace = () => {
  const { assignmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const toast = useToast();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(
    (location.state as { assignment?: AssignmentDetail } | undefined)?.assignment ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [rubricScores, setRubricScores] = useState<Record<string, { score: number; maxScore: number }>>({});
  const [preference, setPreference] = useState<string>('');
  const [demonstration, setDemonstration] = useState('');
  const [comment, setComment] = useState('');
  const [flagSeverity, setFlagSeverity] = useState<string>('info');
  const [flagNotes, setFlagNotes] = useState('');
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    if (!assignmentId || !user || assignment) return;
    const load = async () => {
      setLoading(true);
      try {
        const assignments = await fetchAssignments(user.id);
        const match = assignments.find((item) => item.id === Number(assignmentId));
        if (match) {
          setAssignment(match);
          if (match.task.annotation_type === 'rubric') {
            setRubricScores(getAnnotationDefaults(match));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assignmentId, assignment, user]);

  useEffect(() => {
    if (assignment && assignment.task.annotation_type === 'rubric') {
      setRubricScores(getAnnotationDefaults(assignment));
    }
  }, [assignment]);

  const updateRubric = (dimension: string, score: number, maxScore: number) => {
    setRubricScores((current) => ({
      ...current,
      [dimension]: { score, maxScore },
    }));
  };

  const handleSubmit = async () => {
    if (!assignment || !user) return;
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {};
      if (assignment.task.annotation_type === 'rubric') {
        payload['rubric_scores'] = Object.entries(rubricScores).map(([dimension, value]) => ({
          dimension,
          score: value.score,
          max_score: value.maxScore,
        }));
      } else if (assignment.task.annotation_type === 'comparison') {
        payload['preferred_output_id'] = Number(preference);
        payload['rejected_output_ids'] = assignment.model_outputs
          .filter((output) => String(output.id) !== preference)
          .map((output) => output.id);
      } else if (assignment.task.annotation_type === 'demonstration') {
        payload['demonstration'] = demonstration;
      }

      const safety = flagged
        ? {
            severity: flagSeverity,
            tags: flagNotes ? flagNotes.split(',').map((tag) => tag.trim()) : [],
          }
        : null;

      await submitAnnotation(assignment.id, user.id, payload, comment, safety);
      toast({ title: 'Annotation submitted', status: 'success' });
      navigate('/dashboard');
    } catch (error) {
      toast({ title: 'Failed to submit annotation', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const annotationType = assignment?.task.annotation_type as AnnotationType | undefined;

  if (!assignment) {
    return (
      <Box p={8}>
        <Heading size="md">Loading assignment...</Heading>
      </Box>
    );
  }

  return (
    <Box p={8} minH="100vh" bg="gray.50">
      <Card maxW="5xl" margin="0 auto" shadow="xl" borderRadius="2xl">
        <CardBody>
          <Stack spacing={8}>
            <Stack spacing={1}>
              <Badge colorScheme="teal" w="fit-content">
                {assignment.task.annotation_type.toUpperCase()}
              </Badge>
              <Heading size="lg">{assignment.prompt.title}</Heading>
              <Text color="gray.600">{assignment.prompt.body}</Text>
            </Stack>

            <Box>
              <Heading size="sm" mb={3}>
                Model responses
              </Heading>
              <Stack spacing={4}>
                {assignment.model_outputs.map((output) => (
                  <Box key={output.id} bg="gray.100" borderRadius="lg" p={4}>
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="medium">{output.model_version}</Text>
                      <Badge colorScheme="purple">#{output.id}</Badge>
                    </HStack>
                    <Text whiteSpace="pre-wrap">{output.response}</Text>
                  </Box>
                ))}
                {assignment.model_outputs.length === 0 && (
                  <Alert status="info">
                    <AlertIcon />
                    <AlertDescription>
                      No model responses attached. Provide a clinician demonstration below.
                    </AlertDescription>
                  </Alert>
                )}
              </Stack>
            </Box>

            <Divider />

            {annotationType === 'rubric' && (
              <VStack align="stretch" spacing={4}>
                <Heading size="sm">Rubric scoring</Heading>
                {Object.entries(rubricScores).map(([dimension, value]) => (
                  <FormControl key={dimension}>
                    <FormLabel>{dimension}</FormLabel>
                    <NumberInput
                      min={0}
                      max={value.maxScore}
                      value={value.score}
                      onChange={(nextValue) => updateRubric(dimension, Number(nextValue), value.maxScore)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                ))}
              </VStack>
            )}

            {annotationType === 'comparison' && (
              <FormControl>
                <FormLabel>Select the strongest model response</FormLabel>
                <RadioGroup value={preference} onChange={setPreference}>
                  <Stack spacing={3}>
                    {assignment.model_outputs.map((output) => (
                      <Radio key={output.id} value={String(output.id)}>
                        #{output.id} – {output.model_version}
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              </FormControl>
            )}

            {annotationType === 'demonstration' && (
              <FormControl>
                <FormLabel>Provide a corrected demonstration</FormLabel>
                <Textarea
                  value={demonstration}
                  onChange={(event) => setDemonstration(event.target.value)}
                  placeholder="Compose the ideal Holowellness response here..."
                  minH="160px"
                />
              </FormControl>
            )}

            <FormControl>
              <FormLabel>Rationale & Observations</FormLabel>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Explain safety concerns, empathy notes, or escalation guidance."
              />
            </FormControl>

            <Box>
              <Heading size="sm" mb={3}>
                Safety escalation
              </Heading>
              <Stack spacing={3}>
                <RadioGroup value={flagged ? 'yes' : 'no'} onChange={(value) => setFlagged(value === 'yes')}>
                  <HStack spacing={6}>
                    <Radio value="no">No issues</Radio>
                    <Radio value="yes">Flag for review</Radio>
                  </HStack>
                </RadioGroup>
                {flagged && (
                  <Stack spacing={3}>
                    <FormControl>
                      <FormLabel>Severity</FormLabel>
                      <RadioGroup value={flagSeverity} onChange={setFlagSeverity}>
                        <HStack spacing={6}>
                          <Radio value="info">Info</Radio>
                          <Radio value="warning">Warning</Radio>
                          <Radio value="critical">Critical</Radio>
                        </HStack>
                      </RadioGroup>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Tags</FormLabel>
                      <Textarea
                        value={flagNotes}
                        onChange={(event) => setFlagNotes(event.target.value)}
                        placeholder="Comma-separated tags, e.g. crisis, contraindication"
                      />
                    </FormControl>
                  </Stack>
                )}
              </Stack>
            </Box>

            <Button
              colorScheme="teal"
              size="lg"
              alignSelf="flex-end"
              onClick={handleSubmit}
              isLoading={loading}
              isDisabled={
                loading ||
                (annotationType === 'comparison' && !preference) ||
                (annotationType === 'demonstration' && demonstration.trim().length === 0)
              }
            >
              Submit annotation
            </Button>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default TaskWorkspace;
