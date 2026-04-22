export type User = {
  _id: string;
  name: string;
  email: string;
  photoUrl: string;
};

export type Workspace = {
  _id: string;
  name: string;
  code: string;
  createdBy: string;
  photoUrl?: string;
};

export type Document = {
  _id: string;
  workspace: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  _id: string;
  workspace: string;
  text: string;
  fileUrl?: string;
  fileType?: string;
  createdAt: string;
  updatedAt: string;
  user: User;
};

export type TypingUser = Pick<User, "_id" | "name" | "photoUrl">;
