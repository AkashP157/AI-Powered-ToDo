class TodoApp {
    constructor() {
        this.tasks = this.loadFromStorage();
        this.taskIdCounter = this.getNextTaskId();
        this.aiSettings = this.loadAISettings();
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
        this.initModal();
    }

    bindEvents() {
        const taskInput = document.getElementById('taskInput');
        const addTaskBtn = document.getElementById('addTaskBtn');

        // Add task events
        addTaskBtn.addEventListener('click', () => this.addTask());
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Settings events
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        
        // Clear tasks event
        document.getElementById('clearTasksBtn').addEventListener('click', () => this.clearAllTasks());
    }

    initModal() {
        const modal = document.getElementById('settingsModal');
        const closeBtn = document.querySelector('.close');

        closeBtn.addEventListener('click', () => this.closeSettings());
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.closeSettings();
        });

        // Load saved settings into form
        this.loadSettingsToForm();
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const title = taskInput.value.trim();

        if (title === '') {
            alert('Please enter a task title');
            return;
        }

        const task = {
            id: this.taskIdCounter++,
            title: title,
            completed: false,
            subtasks: []
        };

        this.tasks.push(task);
        taskInput.value = '';
        this.saveToStorage();
        this.render();
        this.updateStats();
    }

    addSubtask(taskId, subtaskTitle) {
        if (subtaskTitle.trim() === '') {
            alert('Please enter a subtask title');
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = {
                id: this.taskIdCounter++,
                title: subtaskTitle.trim(),
                completed: false
            };
            task.subtasks.push(subtask);
            this.saveToStorage();
            this.render();
            this.updateStats();
        }
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            // Also toggle all subtasks
            task.subtasks.forEach(subtask => {
                subtask.completed = task.completed;
            });
            this.saveToStorage();
            this.render();
            this.updateStats();
        }
    }

    toggleSubtaskComplete(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = task.subtasks.find(st => st.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                
                // Check if all subtasks are completed to auto-complete main task
                const allSubtasksCompleted = task.subtasks.length > 0 && 
                    task.subtasks.every(st => st.completed);
                
                // Check if any subtask is incomplete to auto-uncomplete main task
                const anySubtaskIncomplete = task.subtasks.some(st => !st.completed);
                
                if (allSubtasksCompleted && !task.completed) {
                    task.completed = true;
                } else if (anySubtaskIncomplete && task.completed) {
                    task.completed = false;
                }
                
                this.saveToStorage();
                this.render();
                this.updateStats();
            }
        }
    }

    updateTaskTitle(taskId, newTitle) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && newTitle.trim() !== '') {
            task.title = newTitle.trim();
            this.saveToStorage();
        }
    }

    updateSubtaskTitle(taskId, subtaskId, newTitle) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = task.subtasks.find(st => st.id === subtaskId);
            if (subtask && newTitle.trim() !== '') {
                subtask.title = newTitle.trim();
                this.saveToStorage();
            }
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task and all its subtasks?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveToStorage();
            this.render();
            this.updateStats();
        }
    }

    deleteSubtask(taskId, subtaskId) {
        if (confirm('Are you sure you want to delete this subtask?')) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
                this.saveToStorage();
                this.render();
                this.updateStats();
            }
        }
    }

    render() {
        const tasksList = document.getElementById('tasksList');
        
        if (this.tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks yet!</h3>
                    <p>Add your first task above to get started.</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = this.tasks.map(task => this.renderTask(task)).join('');
    }

    renderTask(task) {
        const subtasksHtml = task.subtasks.map(subtask => `
            <div class="subtask-item">
                <input type="checkbox" class="subtask-checkbox" 
                       ${subtask.completed ? 'checked' : ''} 
                       onchange="todoApp.toggleSubtaskComplete(${task.id}, ${subtask.id})">
                <input type="text" class="subtask-title ${subtask.completed ? 'completed' : ''}" 
                       value="${this.escapeHtml(subtask.title)}"
                       onblur="todoApp.updateSubtaskTitle(${task.id}, ${subtask.id}, this.value)"
                       onkeypress="if(event.key==='Enter') this.blur()">
                <button class="btn-delete-subtask" 
                        onclick="todoApp.deleteSubtask(${task.id}, ${subtask.id})">Delete</button>
            </div>
        `).join('');

        const hasAISettings = this.aiSettings.endpoint && this.aiSettings.apiKey;
        const subtaskCount = task.subtasks.length;
        const canGenerateAI = hasAISettings && subtaskCount < 5;

        return `
            <li class="task-item">
                <div class="task-header">
                    <input type="checkbox" class="task-checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="todoApp.toggleTaskComplete(${task.id})">
                    <input type="text" class="task-title ${task.completed ? 'completed' : ''}" 
                           value="${this.escapeHtml(task.title)}"
                           onblur="todoApp.updateTaskTitle(${task.id}, this.value)"
                           onkeypress="if(event.key==='Enter') this.blur()">
                    <div class="task-actions">
                        <button class="btn btn-add-subtask" 
                                onclick="todoApp.showSubtaskInput(${task.id})">Add Subtask</button>
                        <button class="btn btn-generate-ai" 
                                onclick="todoApp.generateAISubtasks(${task.id})"
                                ${!canGenerateAI ? 'disabled' : ''}
                                title="${!hasAISettings ? 'Configure AI settings first' : subtaskCount >= 5 ? 'Maximum 5 subtasks allowed' : 'Generate AI subtasks'}">
                                🤖 Generate Sub-Tasks</button>
                        <button class="btn btn-delete" 
                                onclick="todoApp.deleteTask(${task.id})">Delete</button>
                    </div>
                </div>
                <div class="subtasks">
                    <div id="subtask-input-${task.id}" style="display: none;">
                        <input type="text" class="subtask-input" 
                               placeholder="Enter subtask title..."
                               onkeypress="if(event.key==='Enter') todoApp.addSubtaskFromInput(${task.id}, this)">
                    </div>
                    ${subtasksHtml}
                </div>
            </li>
        `;
    }

    showSubtaskInput(taskId) {
        const subtaskInputDiv = document.getElementById(`subtask-input-${taskId}`);
        const input = subtaskInputDiv.querySelector('.subtask-input');
        
        if (subtaskInputDiv.style.display === 'none') {
            subtaskInputDiv.style.display = 'block';
            input.focus();
        } else {
            subtaskInputDiv.style.display = 'none';
            input.value = '';
        }
    }

    addSubtaskFromInput(taskId, inputElement) {
        const title = inputElement.value.trim();
        if (title) {
            this.addSubtask(taskId, title);
            inputElement.value = '';
            document.getElementById(`subtask-input-${taskId}`).style.display = 'none';
        }
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        
        document.getElementById('totalTasks').textContent = `Total: ${totalTasks}`;
        document.getElementById('completedTasks').textContent = `Completed: ${completedTasks}`;
        
        // Enable/disable clear button based on whether there are tasks
        const clearBtn = document.getElementById('clearTasksBtn');
        clearBtn.disabled = totalTasks === 0;
    }

    clearAllTasks() {
        if (this.tasks.length === 0) {
            return;
        }

        const confirmMessage = `Are you sure you want to delete all ${this.tasks.length} tasks? This action cannot be undone.`;
        
        if (confirm(confirmMessage)) {
            this.tasks = [];
            this.taskIdCounter = 1;
            this.saveToStorage();
            this.render();
            this.updateStats();
            
            // Show success message
            setTimeout(() => {
                alert('All tasks have been cleared successfully!');
            }, 100);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveToStorage() {
        localStorage.setItem('todoAppTasks', JSON.stringify(this.tasks));
        localStorage.setItem('todoAppTaskCounter', this.taskIdCounter.toString());
    }

    loadFromStorage() {
        const saved = localStorage.getItem('todoAppTasks');
        return saved ? JSON.parse(saved) : [];
    }

    getNextTaskId() {
        const saved = localStorage.getItem('todoAppTaskCounter');
        return saved ? parseInt(saved) : 1;
    }

    // AI Settings Methods
    openSettings() {
        document.getElementById('settingsModal').style.display = 'block';
    }

    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
        document.getElementById('connectionStatus').textContent = '';
        document.getElementById('connectionStatus').className = 'status-message';
    }

    loadSettingsToForm() {
        document.getElementById('apiEndpoint').value = this.aiSettings.endpoint || '';
        document.getElementById('apiKey').value = this.aiSettings.apiKey || '';
        document.getElementById('modelName').value = this.aiSettings.modelName || '';
    }

    saveSettings() {
        const endpoint = document.getElementById('apiEndpoint').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();
        const modelName = document.getElementById('modelName').value.trim();

        if (!endpoint || !apiKey || !modelName) {
            this.showStatus('Please fill in all fields', 'error');
            return;
        }

        this.aiSettings = { endpoint, apiKey, modelName };
        this.saveAISettings();
        this.showStatus('Settings saved successfully!', 'success');
        this.render(); // Re-render to update button states
        
        setTimeout(() => this.closeSettings(), 1500);
    }

    async testConnection() {
        const endpoint = document.getElementById('apiEndpoint').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();
        const modelName = document.getElementById('modelName').value.trim();

        if (!endpoint || !apiKey || !modelName) {
            this.showStatus('Please fill in all fields first', 'error');
            return;
        }

        this.showStatus('Testing connection...', 'loading');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: 'Hello, this is a test connection. Please respond with "Test successful".'
                        }
                    ],
                    max_tokens: 50,
                    temperature: 0.1,
                    model: modelName
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    this.showStatus('✅ Connection successful!', 'success');
                } else {
                    this.showStatus('❌ Unexpected response format', 'error');
                }
            } else {
                const errorText = await response.text();
                this.showStatus(`❌ Connection failed: ${response.status} - ${errorText}`, 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Connection error: ${error.message}`, 'error');
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.textContent = message;
        statusEl.className = `status-message status-${type}`;
    }

    async generateAISubtasks(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!this.aiSettings.endpoint || !this.aiSettings.apiKey) {
            alert('Please configure AI settings first');
            return;
        }

        if (task.subtasks.length >= 5) {
            alert('Maximum 5 subtasks allowed per task');
            return;
        }

        // Show loading overlay
        document.getElementById('loadingOverlay').style.display = 'block';

        try {
            // Create context for the AI
            const existingSubtasks = task.subtasks.length > 0 
                ? `\n\nExisting subtasks already created:\n${task.subtasks.map((st, i) => `${i + 1}. ${st.title}`).join('\n')}`
                : '';

            const remainingSlots = 5 - task.subtasks.length;
            
            const prompt = `Break down this task into ${remainingSlots} specific, actionable, mutually exclusive and collectively exhaustive subtasks:

Task: "${task.title}"${existingSubtasks}

Requirements:
- Generate exactly ${remainingSlots} subtasks
- Each subtask should be mutually exclusive (no overlap)
- Together they should be collectively exhaustive (cover everything needed)
- Keep each subtask VERY concise and actionable (maximum 50 characters each)
- Use brief, clear language
- Respond with only the subtasks, one per line, numbered

Subtasks:`;

            const response = await fetch(this.aiSettings.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.aiSettings.apiKey}`
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7,
                    model: this.aiSettings.modelName
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiResponse = data.choices[0].message.content;
                
                // Parse the AI response to extract subtasks
                const subtaskLines = aiResponse.split('\n')
                    .filter(line => line.trim())
                    .map(line => line.replace(/^\d+\.\s*/, '').trim())
                    .filter(line => line.length > 0)
                    .map(line => line.length > 50 ? line.substring(0, 47) + '...' : line) // Ensure 50 char max
                    .slice(0, remainingSlots); // Ensure we don't exceed the limit

                // Add the generated subtasks
                subtaskLines.forEach(subtaskTitle => {
                    if (subtaskTitle && task.subtasks.length < 5) {
                        const subtask = {
                            id: this.taskIdCounter++,
                            title: subtaskTitle,
                            completed: false
                        };
                        task.subtasks.push(subtask);
                    }
                });

                this.saveToStorage();
                this.render();
                this.updateStats();
                
                // Show success message
                alert(`Successfully generated ${subtaskLines.length} AI subtasks!`);
            } else {
                const errorText = await response.text();
                alert(`Failed to generate subtasks: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            alert(`Error generating subtasks: ${error.message}`);
        } finally {
            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }

    loadAISettings() {
        const saved = localStorage.getItem('todoAppAISettings');
        return saved ? JSON.parse(saved) : { endpoint: '', apiKey: '', modelName: '' };
    }

    saveAISettings() {
        localStorage.setItem('todoAppAISettings', JSON.stringify(this.aiSettings));
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.todoApp = new TodoApp();
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to add task
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const taskInput = document.getElementById('taskInput');
        if (taskInput.value.trim()) {
            todoApp.addTask();
        }
    }
});