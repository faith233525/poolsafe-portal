import React, { useState } from "react";

export default function Todo() {
  const [todos, setTodos] = useState<{ title: string; description: string }[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setTodos([...todos, { title, description }]);
    setTitle("");
    setDescription("");
  }

  return (
    <div>
      <h2>Todo List</h2>
      <form onSubmit={handleAddTodo}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Add Todo</button>
      </form>
      <ul>
        {todos.map((todo, idx) => (
          <li key={idx}>
            <strong>{todo.title}</strong>: {todo.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
