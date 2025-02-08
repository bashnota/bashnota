The REST API
An interactive version is available here.

GET /api/
Get the Jupyter Server version

This endpoint returns only the Jupyter Server version. It does not require any authentication.

Status Codes
:
200 OK – Jupyter Server version information

Response JSON Object
:
version (string) – The Jupyter Server version number as a string.

GET /api/contents/{path}
Get contents of file or directory

A client can optionally specify a type and/or format argument via URL parameter. When given, the Contents service shall return a model in the requested type and/or format. If the request cannot be satisfied, e.g. type=text is requested, but the file is binary, then the request shall fail with 400 and have a JSON response containing a ‘reason’ field, with the value ‘bad format’ or ‘bad type’, depending on what was requested.

Parameters
:
path (string) – file path

Query Parameters
:
type (string) – File type (‘file’, ‘directory’)

format (string) – How file content should be returned (‘text’, ‘base64’)

content (integer) – Return content (0 for no content, 1 for return content)

hash (integer) – May return hash hexdigest string of content and the hash algorithm (0 for no hash - default, 1 for return hash). It may be ignored by the content manager.

Status Codes
:
200 OK – Contents of file or directory

400 Bad Request – Bad request

404 Not Found – No item found

500 Internal Server Error – Model key error

Response Headers
:
Last-Modified – Last modified date for file

Response JSON Object
:
content (string) – The content, if requested (otherwise null). Will be an array if type is ‘directory’ (required)

created (string) – Creation timestamp (required)

format (string) – Format of content (one of null, ‘text’, ‘base64’, ‘json’) (required)

hash (string) – [optional] The hexdigest hash string of content, if requested (otherwise null). It cannot be null if hash_algorithm is defined.

hash_algorithm (string) – [optional] The algorithm used to produce the hash, if requested (otherwise null). It cannot be null if hash is defined.

last_modified (string) – Last modified timestamp (required)

mimetype (string) – The mimetype of a file. If content is not null, and type is ‘file’, this will contain the mimetype of the file, otherwise this will be null. (required)

name (string) – Name of file or directory, equivalent to the last part of the path (required)

path (string) – Full path for file or directory (required)

size (integer) – The size of the file or notebook in bytes. If no size is provided, defaults to null.

type (string) – Type of content (required)

writable (boolean) – indicates whether the requester has permission to edit the file (required)

POST /api/contents/{path}
Create a new file in the specified path

A POST to /api/contents/path creates a New untitled, empty file or directory. A POST to /api/contents/path with body {‘copy_from’: ‘/path/to/OtherNotebook.ipynb’} creates a new copy of OtherNotebook in path.

Parameters
:
path (string) – file path

Request JSON Object
:
copy_from (string)

ext (string)

type (string)

Status Codes
:
201 Created – File created

400 Bad Request – Bad request

404 Not Found – No item found

Response Headers
:
Location – URL for the new file

Response JSON Object
:
content (string) – The content, if requested (otherwise null). Will be an array if type is ‘directory’ (required)

created (string) – Creation timestamp (required)

format (string) – Format of content (one of null, ‘text’, ‘base64’, ‘json’) (required)

hash (string) – [optional] The hexdigest hash string of content, if requested (otherwise null). It cannot be null if hash_algorithm is defined.

hash_algorithm (string) – [optional] The algorithm used to produce the hash, if requested (otherwise null). It cannot be null if hash is defined.

last_modified (string) – Last modified timestamp (required)

mimetype (string) – The mimetype of a file. If content is not null, and type is ‘file’, this will contain the mimetype of the file, otherwise this will be null. (required)

name (string) – Name of file or directory, equivalent to the last part of the path (required)

path (string) – Full path for file or directory (required)

size (integer) – The size of the file or notebook in bytes. If no size is provided, defaults to null.

type (string) – Type of content (required)

writable (boolean) – indicates whether the requester has permission to edit the file (required)

PATCH /api/contents/{path}
Rename a file or directory without re-uploading content

Parameters
:
path (string) – file path

Request JSON Object
:
path (string) – New path for file or directory

Status Codes
:
200 OK – Path updated

400 Bad Request – No data provided

Response Headers
:
Location – Updated URL for the file or directory

Response JSON Object
:
content (string) – The content, if requested (otherwise null). Will be an array if type is ‘directory’ (required)

created (string) – Creation timestamp (required)

format (string) – Format of content (one of null, ‘text’, ‘base64’, ‘json’) (required)

hash (string) – [optional] The hexdigest hash string of content, if requested (otherwise null). It cannot be null if hash_algorithm is defined.

hash_algorithm (string) – [optional] The algorithm used to produce the hash, if requested (otherwise null). It cannot be null if hash is defined.

last_modified (string) – Last modified timestamp (required)

mimetype (string) – The mimetype of a file. If content is not null, and type is ‘file’, this will contain the mimetype of the file, otherwise this will be null. (required)

name (string) – Name of file or directory, equivalent to the last part of the path (required)

path (string) – Full path for file or directory (required)

size (integer) – The size of the file or notebook in bytes. If no size is provided, defaults to null.

type (string) – Type of content (required)

writable (boolean) – indicates whether the requester has permission to edit the file (required)

PUT /api/contents/{path}
Save or upload file.

Saves the file in the location specified by name and path. PUT is very similar to POST, but the requester specifies the name, whereas with POST, the server picks the name.

Parameters
:
path (string) – file path

Request JSON Object
:
content (string) – The actual body of the document excluding directory type

format (string) – File format (‘json’, ‘text’, ‘base64’)

name (string) – The new filename if changed

path (string) – New path for file or directory

type (string) – Path dtype (‘notebook’, ‘file’, ‘directory’)

Status Codes
:
200 OK – File saved

201 Created – Path created

400 Bad Request – No data provided

Response Headers
:
Location – Updated URL for the file or directory

Location – URL for the file or directory

Response JSON Object
:
content (string) – The content, if requested (otherwise null). Will be an array if type is ‘directory’ (required)

created (string) – Creation timestamp (required)

format (string) – Format of content (one of null, ‘text’, ‘base64’, ‘json’) (required)

hash (string) – [optional] The hexdigest hash string of content, if requested (otherwise null). It cannot be null if hash_algorithm is defined.

hash_algorithm (string) – [optional] The algorithm used to produce the hash, if requested (otherwise null). It cannot be null if hash is defined.

last_modified (string) – Last modified timestamp (required)

mimetype (string) – The mimetype of a file. If content is not null, and type is ‘file’, this will contain the mimetype of the file, otherwise this will be null. (required)

name (string) – Name of file or directory, equivalent to the last part of the path (required)

path (string) – Full path for file or directory (required)

size (integer) – The size of the file or notebook in bytes. If no size is provided, defaults to null.

type (string) – Type of content (required)

writable (boolean) – indicates whether the requester has permission to edit the file (required)

content – The content, if requested (otherwise null). Will be an array if type is ‘directory’ (required)

created – Creation timestamp (required)

format – Format of content (one of null, ‘text’, ‘base64’, ‘json’) (required)

hash – [optional] The hexdigest hash string of content, if requested (otherwise null). It cannot be null if hash_algorithm is defined.

hash_algorithm – [optional] The algorithm used to produce the hash, if requested (otherwise null). It cannot be null if hash is defined.

last_modified – Last modified timestamp (required)

mimetype – The mimetype of a file. If content is not null, and type is ‘file’, this will contain the mimetype of the file, otherwise this will be null. (required)

name – Name of file or directory, equivalent to the last part of the path (required)

path – Full path for file or directory (required)

size – The size of the file or notebook in bytes. If no size is provided, defaults to null.

type – Type of content (required)

writable – indicates whether the requester has permission to edit the file (required)

DELETE /api/contents/{path}
Delete a file in the given path

Parameters
:
path (string) – file path

Status Codes
:
204 No Content – File deleted

Response Headers
:
Location – URL for the removed file

GET /api/contents/{path}/checkpoints
Get a list of checkpoints for a file

List checkpoints for a given file. There will typically be zero or one results.

Parameters
:
path (string) – file path

Status Codes
:
200 OK – List of checkpoints for a file

400 Bad Request – Bad request

404 Not Found – No item found

500 Internal Server Error – Model key error

Response JSON Object
:
[].id (string) – Unique id for the checkpoint. (required)

[].last_modified (string) – Last modified timestamp (required)

POST /api/contents/{path}/checkpoints
Create a new checkpoint for a file

Create a new checkpoint with the current state of a file. With the default FileContentsManager, only one checkpoint is supported, so creating new checkpoints clobbers existing ones.

Parameters
:
path (string) – file path

Status Codes
:
201 Created – Checkpoint created

400 Bad Request – Bad request

404 Not Found – No item found

Response Headers
:
Location – URL for the checkpoint

Response JSON Object
:
id (string) – Unique id for the checkpoint. (required)

last_modified (string) – Last modified timestamp (required)

POST /api/contents/{path}/checkpoints/{checkpoint_id}
Restore a file to a particular checkpointed state

Parameters
:
path (string) – file path

checkpoint_id (string) – Checkpoint id for a file

Status Codes
:
204 No Content – Checkpoint restored

400 Bad Request – Bad request

DELETE /api/contents/{path}/checkpoints/{checkpoint_id}
Delete a checkpoint

Parameters
:
path (string) – file path

checkpoint_id (string) – Checkpoint id for a file

Status Codes
:
204 No Content – Checkpoint deleted

GET /api/sessions/{session}
Get session

Parameters
:
session (string) – session uuid

Status Codes
:
200 OK – Session

Response JSON Object
:
id (string)

kernel (any) – Kernel information

name (string) – name of the session

path (string) – path to the session

type (string) – session type

PATCH /api/sessions/{session}
This can be used to rename the session.

Parameters
:
session (string) – session uuid

Request JSON Object
:
id (string)

kernel (any) – Kernel information

name (string) – name of the session

path (string) – path to the session

type (string) – session type

Status Codes
:
200 OK – Session

400 Bad Request – No data provided

Response JSON Object
:
id (string)

kernel (any) – Kernel information

name (string) – name of the session

path (string) – path to the session

type (string) – session type

DELETE /api/sessions/{session}
Delete a session

Parameters
:
session (string) – session uuid

Status Codes
:
204 No Content – Session (and kernel) were deleted

410 Gone – Kernel was deleted before the session, and the session was not deleted (TODO - check to make sure session wasn’t deleted)

GET /api/sessions
List available sessions

Status Codes
:
200 OK – List of current sessions

Response JSON Object
:
[].id (string)

[].kernel (any) – Kernel information

[].name (string) – name of the session

[].path (string) – path to the session

[].type (string) – session type

POST /api/sessions
Create a new session, or return an existing session if a session of the same name already exists

Request JSON Object
:
id (string)

kernel (any) – Kernel information

name (string) – name of the session

path (string) – path to the session

type (string) – session type

Status Codes
:
201 Created – Session created or returned

501 Not Implemented – Session not available

Response Headers
:
Location – URL for session commands

Response JSON Object
:
id (string)

kernel (any) – Kernel information

name (string) – name of the session

path (string) – path to the session

type (string) – session type

GET /api/kernels
List the JSON data for all kernels that are currently running

Status Codes
:
200 OK – List of currently-running kernel uuids

Response JSON Object
:
[] (any) – Kernel information

POST /api/kernels
Start a kernel and return the uuid

Request JSON Object
:
name (string) – Kernel spec name (defaults to default kernel spec for server) (required)

path (string) – API path from root to the cwd of the kernel

Status Codes
:
201 Created – Kernel started

Response Headers
:
Location – Model for started kernel

GET /api/kernels/{kernel_id}
Get kernel information

Parameters
:
kernel_id (string) – kernel uuid

Status Codes
:
200 OK – Kernel information

DELETE /api/kernels/{kernel_id}
Kill a kernel and delete the kernel id

Parameters
:
kernel_id (string) – kernel uuid

Status Codes
:
204 No Content – Kernel deleted

POST /api/kernels/{kernel_id}/interrupt
Interrupt a kernel

Parameters
:
kernel_id (string) – kernel uuid

Status Codes
:
204 No Content – Kernel interrupted

POST /api/kernels/{kernel_id}/restart
Restart a kernel

Parameters
:
kernel_id (string) – kernel uuid

Status Codes
:
200 OK – Kernel restarted

Response Headers
:
Location – URL for kernel commands

GET /api/kernelspecs
Get kernel specs

Status Codes
:
200 OK – Kernel specs

Response JSON Object
:
default (string) – Default kernel name

kernelspecs (object)

GET /api/config/{section_name}
Get a configuration section by name

Parameters
:
section_name (string) – Name of config section

Status Codes
:
200 OK – Configuration object

PATCH /api/config/{section_name}
Update a configuration section by name

Parameters
:
section_name (string) – Name of config section

Status Codes
:
200 OK – Configuration object

GET /api/terminals
Get available terminals

Status Codes
:
200 OK – A list of all available terminal ids.

403 Forbidden – Forbidden to access

404 Not Found – Not found

Response JSON Object
:
[].last_activity (string) – ISO 8601 timestamp for the last-seen activity on this terminal. Use this to identify which terminals have been inactive since a given time. Timestamps will be UTC, indicated ‘Z’ suffix.

[].name (string) – name of terminal (required)

POST /api/terminals
Create a new terminal

Status Codes
:
200 OK – Successfully created a new terminal

403 Forbidden – Forbidden to access

404 Not Found – Not found

Response JSON Object
:
last_activity (string) – ISO 8601 timestamp for the last-seen activity on this terminal. Use this to identify which terminals have been inactive since a given time. Timestamps will be UTC, indicated ‘Z’ suffix.

name (string) – name of terminal (required)

GET /api/terminals/{terminal_id}
Get a terminal session corresponding to an id.

Parameters
:
terminal_id (string) – ID of terminal session

Status Codes
:
200 OK – Terminal session with given id

403 Forbidden – Forbidden to access

404 Not Found – Not found

Response JSON Object
:
last_activity (string) – ISO 8601 timestamp for the last-seen activity on this terminal. Use this to identify which terminals have been inactive since a given time. Timestamps will be UTC, indicated ‘Z’ suffix.

name (string) – name of terminal (required)

DELETE /api/terminals/{terminal_id}
Delete a terminal session corresponding to an id.

Parameters
:
terminal_id (string) – ID of terminal session

Status Codes
:
204 No Content – Successfully deleted terminal session

403 Forbidden – Forbidden to access

404 Not Found – Not found

GET /api/me
Get the identity of the currently authenticated user. If present, a `permissions` argument may be specified to check what actions the user currently is authorized to take.

Query Parameters
:
permissions (string) – JSON-serialized dictionary of {"resource": ["action",]} (dict of lists of strings) to check. The same dictionary structure will be returned, containing only the actions for which the user is authorized.

Status Codes
:
200 OK – The user’s identity and permissions

Response JSON Object
:
identity (any) – The identity of the currently authenticated user

permissions (object) – A dict of the form: {"resource": ["action",]} containing only the AUTHORIZED subset of resource+actions from the permissions specified in the request. If no permission checks were made in the request, this will be empty.

GET /api/status
Get the current status/activity of the server.

Status Codes
:
200 OK – The current status of the server

GET /api/spec.yaml
Get the current spec for the notebook server’s APIs.

Status Codes
:
200 OK – The current spec for the notebook server’s APIs