/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Sep 2016     wwinters			Suitelet to run scheduled script from menu shortcut
 *												Can be configured to run ANY scheduled script on demand by scriptId
 *												Scheduled script must be set to 'Not Scheduled' to execute immediately
 *												Deploy script with status 'Released', Execute As Role 'Administrator'
 *												Take note of URL after saving deployment
 *												Make a menu item by creating a Custom Center Link for each script you need executed by this script,
 *													make sure you know the scriptId for the scripts you need to run
 *												Make the link label. EX: Web Store Import
 *												Paste the URL from the Suitelet deployment page and add:
 *													&scriptid=[scriptid]
 *													EX:  &scriptid=customscript_web_store_import
 *													This is the ID of the scheduled script to be executed.
 *
 *												Create a Center Category called 'Run Scheduled Script', add to Classic Center, or whatever center you use
 *												Choose the tab to hold this category, EX: 'Transactions'
 *												Then add the link you just created under the links tab.
 *												Now you can navigate the UI menu to run this script on demand.
 *
 *												When new scheduled scripts are added to be executed on demand, make a new Custom Center Link and add it to the same Center Category
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function schedule(request, response){
	var scriptId = request.getParameter('scriptid');  //Ex: 'customscript_web_store_import'
	// Script ID of the scheduled script to execute immediately (will only run immediately if the scheduled script is set to 'Not Scheduled')
	nlapiScheduleScript(scriptId);
	// Redirect to home page
	response.sendRedirect('TASKLINK', 'CARD_-29');
}
