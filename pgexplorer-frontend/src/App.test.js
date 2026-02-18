import { render, screen, within } from "@testing-library/react";

jest.mock("axios", () => {
  const mockClient = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    create: jest.fn(() => mockClient),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  return {
    __esModule: true,
    default: mockClient,
  };
});

// Require after mocks so axios never loads from node_modules in Jest.
const App = require("./App").default;

test("renders app shell", () => {
  localStorage.clear();
  render(<App />);
  const nav = screen.getByRole("navigation");

  // Logged-out navbar shell
  expect(
    within(nav).getByRole("button", { name: /pg explorer/i }),
  ).toBeInTheDocument();
  expect(
    within(nav).getByRole("button", { name: /find pg/i }),
  ).toBeInTheDocument();
  expect(within(nav).getByRole("link", { name: /login/i })).toBeInTheDocument();
});
