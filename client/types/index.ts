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
};

export type Message = {
  _id: string;
  workspace: string;
  text: string;
  createdAt: string;
  user: User;
};
